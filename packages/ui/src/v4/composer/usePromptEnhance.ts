/**
 * 提示词增强流程状态机。
 *
 * 职责边界：
 * - 只编排「读草稿 → 判定 → 调模型 → 回填 → 立还原点」这条链路，草稿的读写由 composer
 *   注入（与发送失败回滚共用同一组写入路径），本 hook 不持第二份草稿状态。
 * - 设置经 `useSettings()` 读取，缺省与写回形状由 promptEnhance/settings 纯函数负责。
 * - 进行中的请求用单调递增 runId 管，迟到响应按 runId 丢弃，不靠超时掩盖竞态。
 * - 取消走可序列化的 `operationId` + `cancelWorkspaceGenerateText` 控制面调用：
 *   Renderer 传不了 AbortSignal，跨 RPC 会被 JSON 序列化吃掉（详见 operationId.ts）。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PromptEnhanceSettings } from "@kcode/shared";
import type { ConversationRow } from "@kcode/shared/kcode-protocol-v4";
import type { ModelSelectionView } from "@kcode/services";
import { toast } from "@/components/ui/toast.js";
import { useKCodeAgentService } from "@/hooks/useKCodeAgentService.js";
import { useSettings } from "@/hooks/useSettingService.js";
import { useKCodeIntl } from "@/i18n/IntlProvider.js";
import { getErrorMessage } from "@/lib/errorMessage.js";
import { logger } from "@/logger.js";
import {
  buildPromptEnhanceMessages,
  type PromptEnhanceContextRound,
} from "./promptEnhance/compose.js";
import {
  evaluatePromptEnhanceRequest,
  evaluatePromptEnhanceRestore,
  promptEnhanceTextMatches,
} from "./promptEnhance/gates.js";
import {
  createPromptEnhanceRunTracker,
  type PromptEnhanceRun,
  type PromptEnhanceRunTracker,
} from "./promptEnhance/runTracker.js";
import { createPromptEnhanceOperationId } from "./promptEnhance/operationId.js";
import {
  buildPromptEnhanceRequestParams,
  buildPromptEnhanceWorkspaceTarget,
} from "./promptEnhance/request.js";
import { resolvePromptEnhanceTarget } from "./promptEnhance/selection.js";
import { resolvePromptEnhanceSettings } from "./promptEnhance/settings.js";

/** 一轮背景 = 一条真实用户输入 + 其后的完整助手正文（可能多段，可能缺失）。 */
interface PendingPromptEnhanceRound {
  user: string;
  assistant: string[];
}

/** 取最近 N 轮真实对话；系统注入、工作流启动等来源不计入背景。 */
function collectPromptEnhanceContextRounds(
  rows: readonly ConversationRow[],
  limit: number,
): PromptEnhanceContextRound[] {
  const rounds: PromptEnhanceContextRound[] = [];
  let pending: PendingPromptEnhanceRound | null = null;

  const flush = () => {
    if (!pending) return;
    const assistant = pending.assistant.join("\n\n").trim();
    rounds.push(assistant ? { user: pending.user, assistant } : { user: pending.user });
    pending = null;
  };

  for (const row of rows) {
    if (row.kind === "userInput") {
      flush();
      // 非真实用户输入也要断开轮次，否则其后的助手正文会被错挂到上一个用户轮。
      if (row.origin === "realUser") {
        pending = { user: row.text, assistant: [] };
      }
      continue;
    }
    if (pending && row.kind === "assistantText" && row.state === "complete") {
      pending.assistant.push(row.text);
    }
  }
  flush();
  return rounds.slice(-limit);
}

/**
 * 在途请求的取消句柄：发起时把「怎样取消这一次」固化下来。
 *
 * 取消必须回到发起时的 workspace：scope 变化后组件读到的是新 target，按新 target 发取消会打到
 * 另一台 Host，返回 cancelled:false，旧请求继续跑到超时。句柄只由这一个 ref 持有，
 * 作废或正常结束时释放。
 */
interface PendingPromptEnhanceRun {
  readonly operationId: string;
  cancel: () => void;
}

export interface UsePromptEnhanceParams {
  workspacePath: string;
  workspaceIdentity?: string | undefined;
  remoteSessionId?: string | undefined;
  /** 与发送键共用同一组禁用条件来源。 */
  disabled: boolean;
  pending: boolean;
  /** 协议层的输入路由：`reject` 时不提供增强入口。 */
  routingMode: string;
  /** 草稿 scope key（workspace + draft scope）：请求跨 scope 返回时不得回填。 */
  scopeKey: string;
  /** 当前草稿是否有正文；发送成功或手动清空后为 false，还原点随之失效。 */
  hasDraftText: boolean;
  modelSelectionView: ModelSelectionView | null;
  /** 点击时读取草稿里是否有行内引用节点（回填唯一会破坏的内容）。 */
  readHasInlineReferences: () => boolean;
  /** 点击时读取当前投影 rows，避免把流式 snapshot 灌进调用方的 memo 依赖。 */
  readContextRows: () => readonly ConversationRow[];
  /** 读当前草稿正文：优先编辑器正文，回退 composer 本地文本。 */
  readDraftText: () => string;
  /** 回填草稿：与发送失败回滚共用同一条写入路径。 */
  writeDraftText: (text: string) => void;
}

export interface PromptEnhanceController {
  disabled: boolean;
  /** 非空表示正在增强，值为本次请求的开始时间（毫秒）。 */
  runningStartedAt: number | null;
  canRestore: boolean;
  enhance: () => void;
  restore: () => void;
}

export function usePromptEnhance(params: UsePromptEnhanceParams): PromptEnhanceController {
  const {
    disabled,
    hasDraftText,
    modelSelectionView,
    pending,
    readContextRows,
    readDraftText,
    readHasInlineReferences,
    remoteSessionId,
    routingMode,
    scopeKey,
    workspaceIdentity,
    workspacePath,
    writeDraftText,
  } = params;

  const { intl } = useKCodeIntl();
  const { settings } = useSettings();
  const kcodeAgentService = useKCodeAgentService(workspacePath, remoteSessionId, workspaceIdentity);

  const enhanceSettings: PromptEnhanceSettings = useMemo(
    () => resolvePromptEnhanceSettings(settings?.promptEnhance),
    [settings?.promptEnhance],
  );

  const runRef = useRef<PromptEnhanceRunTracker | null>(null);
  if (!runRef.current) {
    runRef.current = createPromptEnhanceRunTracker();
  }
  const runTracker = runRef.current;
  const pendingRunRef = useRef<PendingPromptEnhanceRun | null>(null);
  const restorePointRef = useRef<{ original: string; enhanced: string } | null>(null);
  const [runningStartedAt, setRunningStartedAt] = useState<number | null>(null);
  const [canRestore, setCanRestore] = useState(false);
  // 回调闭包里的 scopeKey 是点击时的快照，判断「还在同一个草稿 scope」必须读当前值。
  const scopeKeyRef = useRef(scopeKey);
  scopeKeyRef.current = scopeKey;

  const showToast = useCallback(
    (id: string, values?: Record<string, string | number>) => {
      toast(intl.formatMessage({ id }, values));
    },
    [intl],
  );

  const finishRun = useCallback(
    (runId: number) => {
      if (!runTracker.finish(runId)) return;
      // 正常结束的 run 不再需要取消；不能让它的句柄影响后来发起的新 run。
      pendingRunRef.current = null;
      setRunningStartedAt(null);
    },
    [runTracker],
  );

  /** 写入失败时只记日志：调用方已各自给出提示，异常不能逃出点击回调。 */
  const writeDraftSafely = useCallback(
    (text: string) => {
      try {
        writeDraftText(text);
      } catch (error) {
        logger.error("[prompt-enhance] 写入草稿失败", { error: getErrorMessage(error) });
      }
    },
    [writeDraftText],
  );

  /**
   * 通知 Host 停掉发起时那一次模型请求。best-effort：Host 按 workspace 路由到对应 Agent
   * 进程，进程已不在时返回 cancelled:false；失败只留日志，不覆盖调用方自己的取消语义。
   */
  const createRunCancel = useCallback(
    (operationId: string): (() => void) => {
      const target = buildPromptEnhanceWorkspaceTarget({
        workspacePath,
        workspaceIdentity,
        remoteSessionId,
      });
      return () => {
        void kcodeAgentService
          .cancelWorkspaceGenerateText({ ...target, operationId })
          .then((result) => {
            // 进程已回收 / 请求已结束都会走到这里：界面已经按「已取消」收尾，
            // 至少留一条轨迹，避免日后排查「说取消了但模型还在跑」时无线索。
            if (!result.cancelled) {
              logger.warn("[prompt-enhance] Host 未找到待取消的请求", { operationId });
            }
          })
          .catch((error: unknown) => {
            logger.warn("[prompt-enhance] 取消请求未送达", {
              operationId,
              error: getErrorMessage(error),
            });
          });
      };
    },
    [kcodeAgentService, remoteSessionId, workspaceIdentity, workspacePath],
  );

  const invalidateRun = useCallback((): PromptEnhanceRun | null => {
    const run = runTracker.invalidate();
    const pending = pendingRunRef.current;
    pendingRunRef.current = null;
    setRunningStartedAt(null);
    if (pending) {
      pending.cancel();
      logger.info("[prompt-enhance] 已通知 Host 取消在途请求", {
        operationId: pending.operationId,
      });
    }
    return run;
  }, [runTracker]);

  const cancelRun = useCallback(() => {
    const run = invalidateRun();
    logger.info("[prompt-enhance] 用户取消", { elapsedMs: run ? Date.now() - run.startedAt : 0 });
    showToast("chat.toolbar.promptEnhance.cancelled");
  }, [invalidateRun, showToast]);

  useEffect(() => {
    // composer 用固定 key 跨 session 复用：上一个草稿的还原点与在途请求都属于旧 scope，
    // 留着会让新会话看到「还原」按钮和一个不会结束的「增强中」。
    restorePointRef.current = null;
    setCanRestore(false);
    if (!runTracker.current()) return;
    invalidateRun();
    // spec 把「草稿 scope 已变化」列为可恢复异常的 warn 轨迹：在途请求作废属于
    // 生命周期边界事件，不是正常流程的 info。
    logger.warn("[prompt-enhance] 草稿 scope 变化，已取消在途增强");
  }, [invalidateRun, scopeKey]);

  useEffect(() => {
    // 草稿被清空（发送成功 / 手动清空）后还原点已无意义：留着会让工具条出现一个
    // 点了必然被拒的「还原」，并给出「草稿已被手动修改」这种误导提示。
    if (hasDraftText) return;
    restorePointRef.current = null;
    setCanRestore(false);
  }, [hasDraftText]);

  const enhance = useCallback(() => {
    if (runTracker.current()) {
      cancelRun();
      return;
    }

    const draftText = readDraftText();
    const decision = evaluatePromptEnhanceRequest({
      draftText,
      // 只查编辑器里的行内引用节点：附件与引用面板不在草稿内容里，回填不会破坏它们。
      hasInlineReferences: readHasInlineReferences(),
      allowInlineReferenceRewrite: enhanceSettings.allowInlineReferenceRewrite,
    });
    if (!decision.allowed) {
      showToast(
        decision.reason === "emptyDraft"
          ? "chat.toolbar.promptEnhance.empty"
          : "chat.toolbar.promptEnhance.inlineReferenceBlocked",
      );
      return;
    }

    const target = resolvePromptEnhanceTarget({
      settings: enhanceSettings,
      preferredSelection: modelSelectionView?.preferredSelection ?? null,
      modelSelectionView,
    });
    if (!target) {
      // 没有模型、或选中模型已不在已发布列表里（Selection View 读不到 Model Config）：
      // 后者无法构造合法请求（预算与档位都取自模型配置），只能先请用户重选。
      logger.warn("[prompt-enhance] 没有可用的增强模型选型", {
        channel: enhanceSettings.channel,
        hasModelSelectionView: modelSelectionView !== null,
      });
      showToast("chat.toolbar.promptEnhance.noModel");
      return;
    }
    const { selection, maxOutputTokens, unsupportedReasoningLevel } = target;
    if (unsupportedReasoningLevel !== undefined) {
      // 档位选择不能原样下发（Registry 会直接拒），这里回落到模型声明的默认档，
      // 留一条轨迹，避免「我设了低档为什么按默认档跑」这种无据可查的疑问。
      logger.warn("[prompt-enhance] 所选推理档位不被模型支持，已回落到模型默认档", {
        requestedReasoningLevel: unsupportedReasoningLevel,
        appliedReasoningLevel: selection.options?.reasoningLevel,
        model: selection.modelId,
      });
    }

    const contextRounds = enhanceSettings.contextEnabled
      ? collectPromptEnhanceContextRounds(readContextRows(), enhanceSettings.contextRounds)
      : [];
    const messages = buildPromptEnhanceMessages({
      mode: enhanceSettings.mode,
      draftText,
      contextRounds,
    });

    const run = runTracker.start();
    const operationId = createPromptEnhanceOperationId();
    pendingRunRef.current = { operationId, cancel: createRunCancel(operationId) };
    setRunningStartedAt(run.startedAt);
    const requestedScopeKey = scopeKey;
    logger.info("[prompt-enhance] 发起增强", {
      mode: enhanceSettings.mode,
      channel: enhanceSettings.channel,
      contextRoundCount: contextRounds.length,
      model: selection.modelId,
      reasoningLevel: selection.options?.reasoningLevel ?? null,
      maxOutputTokens,
      operationId,
      workspaceKind: workspaceIdentity?.trim() ? "remote" : "local",
    });

    void (async () => {
      try {
        const result = await kcodeAgentService.generateWorkspaceText(
          buildPromptEnhanceRequestParams({
            workspacePath,
            workspaceIdentity,
            remoteSessionId,
            selection,
            messages,
            maxOutputTokens,
            operationId,
          }),
        );
        if (!runTracker.isCurrent(run.runId)) return;
        // 切会话/切草稿后 composer 属于另一个草稿 owner：结果按丢弃处理，不回填也不立还原点。
        if (scopeKeyRef.current !== requestedScopeKey) {
          logger.warn("[prompt-enhance] 草稿 scope 已变化，丢弃本次结果", {
            model: result.selection.modelId,
          });
          return;
        }

        const enhanced = result.text.trim();
        if (!enhanced) {
          logger.warn("[prompt-enhance] 模型返回空内容", { model: result.selection.modelId });
          showToast("chat.toolbar.promptEnhance.emptyResult");
          return;
        }

        // 回填要么完整落地、要么完整保留：写入异常或读回不一致都写回原文。
        let filled = false;
        try {
          writeDraftText(enhanced);
          filled = promptEnhanceTextMatches(readDraftText(), enhanced);
        } catch (error) {
          logger.error("[prompt-enhance] 回填草稿异常", { error: getErrorMessage(error) });
        }
        if (!filled) {
          writeDraftSafely(draftText);
          logger.warn("[prompt-enhance] 回填未完整落地，已写回原文", {
            model: result.selection.modelId,
          });
          showToast("chat.toolbar.promptEnhance.fillFailed");
          return;
        }

        restorePointRef.current = { original: draftText, enhanced };
        setCanRestore(true);
        const seconds = Math.max(1, Math.round((Date.now() - run.startedAt) / 1000));
        logger.info("[prompt-enhance] 增强成功", {
          model: result.selection.modelId,
          elapsedMs: Date.now() - run.startedAt,
        });
        showToast("chat.toolbar.promptEnhance.success", {
          seconds,
          model: result.selection.modelId,
        });
      } catch (error) {
        // 取消（或切草稿）后这次 run 已作废：Host 侧的取消错误不该再弹失败提示。
        if (!runTracker.isCurrent(run.runId)) return;
        logger.error("[prompt-enhance] 增强失败", { error: getErrorMessage(error) });
        showToast("chat.toolbar.promptEnhance.failed", { error: getErrorMessage(error) });
      } finally {
        finishRun(run.runId);
      }
    })();
  }, [
    cancelRun,
    createRunCancel,
    enhanceSettings,
    finishRun,
    kcodeAgentService,
    modelSelectionView,
    readContextRows,
    readDraftText,
    readHasInlineReferences,
    remoteSessionId,
    runTracker,
    scopeKey,
    showToast,
    workspaceIdentity,
    workspacePath,
    writeDraftSafely,
    writeDraftText,
  ]);

  const restore = useCallback(() => {
    const point = restorePointRef.current;
    if (!point) return;
    const decision = evaluatePromptEnhanceRestore({
      currentDraftText: readDraftText(),
      enhancedText: point.enhanced,
    });
    restorePointRef.current = null;
    setCanRestore(false);
    if (!decision.allowed) {
      logger.info("[prompt-enhance] 还原被拒：草稿已被手动修改");
      showToast("chat.toolbar.promptEnhance.restoreRejected");
      return;
    }
    writeDraftSafely(point.original);
    showToast("chat.toolbar.promptEnhance.restored");
  }, [readDraftText, showToast, writeDraftSafely]);

  return {
    // 模型视图没就绪时构造不出合法请求（预算与档位都取自 Model Config），
    // 直接禁用而不是点了再弹「没有可用模型」——那会把加载中的瞬态说成配置问题。
    disabled: disabled || pending || routingMode === "reject" || modelSelectionView === null,
    runningStartedAt,
    canRestore,
    enhance,
    restore,
  };
}
