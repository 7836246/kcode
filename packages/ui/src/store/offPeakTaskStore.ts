import { create } from "zustand";
import type {
  OffPeakTaskCreateResult,
  OffPeakTakeNumberAvailability,
  KCodeOffPeakTask,
  ModelSelection,
} from "@kcode/shared";
import type { IOffPeakTaskService, OffPeakClientConfig } from "@kcode/services";
import { logger } from "@/logger.js";

// 闲时任务管理 store（与 automationManagementStore 独立）：走 IOffPeakTaskService RPC。
// 位次/状态靠列表轮询刷新（host offPeakTaskSync 写 sqlite，renderer 只读快照）。

interface CreateOffPeakTaskInput {
  title: string;
  prompt: string;
  /** 权限四档（build/edit/plan/yolo）；类型收窄在服务端入参处完成。 */
  permissionMode: string;
  modelSelection: ModelSelection;
  workspacePath: string;
  workspaceIdentity?: string;
}

interface UpdateOffPeakTaskInput {
  title?: string;
  prompt?: string;
  permissionMode?: string;
  modelSelection?: ModelSelection | null;
}

/** New task 页模板卡点击后携带到 Automations 创建表单的预填草稿（模板=预填）。 */
export interface OffPeakCreateDraft {
  title?: string;
  prompt?: string;
  telemetrySource?: {
    eventRegion: "app.session" | "app.automations";
    templateId: string;
  };
}

/** availability 的请求状态与服务端额度快照分离；只有 ready + canTakeNumber=true 才能放行。 */
export type OffPeakTakeNumberAvailabilityStatus = "idle" | "loading" | "ready" | "error";

interface OffPeakTaskState {
  tasks: KCodeOffPeakTask[];
  loading: boolean;
  error: string | null;
  operationId: string | null;
  /** 官方套餐灰度已下线：null 表示创建入口 fail-closed，存量任务仍可列出。 */
  grayConfig: OffPeakClientConfig | null;
  /** 服务端取号额度即时快照；官方取号下线后保持空。 */
  takeNumberAvailability: OffPeakTakeNumberAvailability | null;
  /** loading/idle/error 均禁入，避免把依赖异常误当成可创建。 */
  takeNumberAvailabilityStatus: OffPeakTakeNumberAvailabilityStatus;
  /** New task 页横幅本次会话是否已被用户关闭（关闭后下次登录/重启再开）。 */
  newTaskBannerDismissed: boolean;
  /** 模板卡→创建表单的预填草稿（跨视图导航一次性携带）。 */
  pendingCreateDraft: OffPeakCreateDraft | null;
  initialize(deps: { offPeakTaskService: IOffPeakTaskService }): Promise<void>;
  refresh(service: IOffPeakTaskService): Promise<void>;
  refreshTakeNumberAvailability(service: IOffPeakTaskService): Promise<void>;
  createTask(
    input: CreateOffPeakTaskInput,
    service: IOffPeakTaskService,
  ): Promise<OffPeakTaskCreateResult>;
  updateTask(
    offPeakTaskId: string,
    input: UpdateOffPeakTaskInput,
    service: IOffPeakTaskService,
  ): Promise<boolean>;
  pauseTask(offPeakTaskId: string, service: IOffPeakTaskService): Promise<void>;
  continueTask(offPeakTaskId: string, service: IOffPeakTaskService): Promise<void>;
  cancelTask(offPeakTaskId: string, service: IOffPeakTaskService): Promise<void>;
  deleteTask(offPeakTaskId: string, service: IOffPeakTaskService): Promise<void>;
  deleteHistory(offPeakTaskId: string, service: IOffPeakTaskService): Promise<void>;
  dismissNewTaskBanner(): void;
  /** 模板卡点击：暂存预填草稿供 Automations 创建表单消费（consume 后清空）。 */
  setPendingCreateDraft(draft: OffPeakCreateDraft): void;
  consumePendingCreateDraft(): OffPeakCreateDraft | null;
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** 服务端 3103（取号超限）只按结构化分类识别，不再解析跨 RPC 的错误文本。 */
function isOffPeakQuotaError(result: OffPeakTaskCreateResult | null | undefined): boolean {
  return (
    result?.ok === false && result.errorCategory === "quota_3103" && result.errorCode === "3103"
  );
}

type OffPeakCreateErrorMessageId =
  | "offPeak.error.quota"
  | "offPeak.error.unavailable"
  | "offPeak.error.generic";

/** 创建失败只按服务端明确业务码映射；原始 RPC 文本仅留日志，不直接展示给用户。 */
export function resolveOffPeakCreateErrorMessageId(
  result: OffPeakTaskCreateResult | null | undefined,
): OffPeakCreateErrorMessageId {
  if (isOffPeakQuotaError(result)) return "offPeak.error.quota";
  if (
    result?.ok === false &&
    (result.errorCategory === "network" ||
      result.errorCategory === "invalid_response" ||
      result.errorCategory === "unknown")
  ) {
    return "offPeak.error.unavailable";
  }
  return "offPeak.error.generic";
}

let initializeInFlight: Promise<void> | null = null;

export const useOffPeakTaskStore = create<OffPeakTaskState>((set, get) => ({
  tasks: [],
  loading: false,
  error: null,
  operationId: null,
  grayConfig: null,
  takeNumberAvailability: null,
  takeNumberAvailabilityStatus: "idle",
  newTaskBannerDismissed: false,
  pendingCreateDraft: null,

  async initialize({ offPeakTaskService }) {
    if (initializeInFlight) return initializeInFlight;
    set({ loading: true, error: null });
    const run = (async () => {
      const tasks = await offPeakTaskService.list().catch((error) => {
        logger.warn("[off-peak] list failed", toErrorMessage(error));
        return [] as KCodeOffPeakTask[];
      });
      // 官方套餐灰度已下线：不再读取 Coding Plan 配置，创建入口保持关闭。
      set({
        grayConfig: null,
        tasks,
        takeNumberAvailability: null,
        takeNumberAvailabilityStatus: "idle",
      });
    })();
    initializeInFlight = run;
    try {
      await run;
    } finally {
      if (initializeInFlight === run) {
        initializeInFlight = null;
        set({ loading: false });
      }
    }
  },

  async refresh(service) {
    try {
      const tasks = await service.list();
      set({ tasks, error: null });
    } catch (error) {
      set({ error: toErrorMessage(error) });
    }
  },

  async refreshTakeNumberAvailability() {
    set({
      takeNumberAvailability: null,
      takeNumberAvailabilityStatus: "idle",
    });
  },

  async createTask(input, service) {
    set({ operationId: "offpeak:create", error: null });
    try {
      const result = await service.createTask(
        input as Parameters<IOffPeakTaskService["createTask"]>[0],
      );
      if (result.ok) {
        await Promise.all([get().refresh(service), get().refreshTakeNumberAvailability(service)]);
        return result;
      }
      // 创建失败说明之前的准入快照已不足以继续放行；只保存稳定分类，不把 raw error 放进 UI 状态。
      set({
        error: result.errorCategory,
        takeNumberAvailability: null,
        takeNumberAvailabilityStatus: "error",
      });
      logger.warn("[off-peak] create failed", {
        errorCategory: result.errorCategory,
        errorCode: result.errorCode,
        failureStage: result.failureStage,
      });
      if (isOffPeakQuotaError(result)) {
        await get().refreshTakeNumberAvailability(service);
      }
      return result;
    } catch (error) {
      // Host/RPC transport 仍可能在结构化服务结果之外失败；统一收敛为 network，
      // toast 只消费稳定分类，禁止解析 raw error。
      const result = {
        ok: false,
        failureStage: "ticket_request",
        errorCategory: "network",
        errorCode: "",
        providerName: "",
      } as const satisfies OffPeakTaskCreateResult;
      set({
        error: result.errorCategory,
        takeNumberAvailability: null,
        takeNumberAvailabilityStatus: "error",
      });
      logger.warn("[off-peak] create RPC transport failed", {
        errorType: error instanceof Error ? error.name : typeof error,
      });
      return result;
    } finally {
      set({ operationId: null });
    }
  },

  async updateTask(offPeakTaskId, input, service) {
    set({ operationId: `offpeak:update:${offPeakTaskId}`, error: null });
    try {
      const updated = await service.updateTask(offPeakTaskId, input);
      await get().refresh(service);
      return updated !== null;
    } catch (error) {
      set({ error: toErrorMessage(error) });
      return false;
    } finally {
      set({ operationId: null });
    }
  },

  async pauseTask(offPeakTaskId, service) {
    set({ operationId: `offpeak:pause:${offPeakTaskId}`, error: null });
    try {
      await service.pauseTask(offPeakTaskId);
      await get().refresh(service);
    } catch (error) {
      set({ error: toErrorMessage(error) });
    } finally {
      set({ operationId: null });
    }
  },

  async continueTask(offPeakTaskId, service) {
    set({ operationId: `offpeak:continue:${offPeakTaskId}`, error: null });
    try {
      await service.continueTask(offPeakTaskId);
      await get().refresh(service);
    } catch (error) {
      set({ error: toErrorMessage(error) });
    } finally {
      set({ operationId: null });
    }
  },

  async cancelTask(offPeakTaskId, service) {
    set({ operationId: `offpeak:cancel:${offPeakTaskId}`, error: null });
    try {
      await service.cancelTask(offPeakTaskId);
      await get().refresh(service);
    } catch (error) {
      set({ error: toErrorMessage(error) });
    } finally {
      set({ operationId: null });
    }
  },

  async deleteTask(offPeakTaskId, service) {
    set({ operationId: `offpeak:delete:${offPeakTaskId}`, error: null });
    try {
      await service.deleteTask(offPeakTaskId);
      await get().refresh(service);
    } catch (error) {
      set({ error: toErrorMessage(error) });
    } finally {
      set({ operationId: null });
    }
  },

  async deleteHistory(offPeakTaskId, service) {
    set({
      operationId: `offpeak:delete-history:${offPeakTaskId}`,
      error: null,
    });
    try {
      await service.deleteHistory(offPeakTaskId);
      await get().refresh(service);
    } catch (error) {
      set({ error: toErrorMessage(error) });
    } finally {
      set({ operationId: null });
    }
  },

  dismissNewTaskBanner() {
    set({ newTaskBannerDismissed: true });
  },

  setPendingCreateDraft(draft) {
    set({ pendingCreateDraft: draft });
  },

  consumePendingCreateDraft() {
    const draft = get().pendingCreateDraft;
    if (draft) set({ pendingCreateDraft: null });
    return draft;
  },
}));
