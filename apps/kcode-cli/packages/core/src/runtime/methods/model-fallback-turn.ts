import type { MessageId, ModelSelection, TraceContext } from "../deps.js";
import { TurnMachineImpl } from "../deps.js";
import type { AgentRuntimeInternal } from "../internal.js";
import { createTurnModel, persistRuntimeModelSelection } from "./turn-model.js";
import { recordModelHistoryRound, type RegularTurnLoopState } from "./turn-loop-state.js";
import { modelFallbackKey, readModelFailoverReason, selectNextModelFallback } from "./model-fallback.js";

/**
 * 同一模型的重试预算已经在 adapter 用完。这里只在可换失败上把本回合切到下一个备用模型。
 * 这次 model step 还没提交工具结果，所以丢弃占位 assistant，已有工具结果留在 turn history。
 */
export async function continueTurnAfterModelFallback(
  runtime: AgentRuntimeInternal,
  input: {
    abandonStreaming: () => Promise<void> | void;
    assistantCreatedAt: number;
    assistantMessageId: MessageId;
    error: unknown;
    modelTraceContext: TraceContext;
    state: RegularTurnLoopState;
  },
): Promise<boolean> {
  if (input.state.turnAbortSignal.aborted) return false;
  if (!readModelFailoverReason(input.error)) return false;

  const current = {
    providerId: String(input.state.model.providerId),
    modelId: String(input.state.model.modelId),
  };
  const tried = input.state.modelFallbackTried ?? [];
  const next = selectNextModelFallback({
    current,
    chain: runtime.config.modelFallbackChain ?? [],
    tried,
  });
  if (!next) return false;

  const selection: ModelSelection = {
    providerId: next.providerId,
    modelId: next.modelId,
  };
  let model;
  try {
    model = createTurnModel(runtime, { selection });
  } catch (cause) {
    runtime.logger?.warn("Model fallback skipped because the backup model could not be created", {
      error: cause instanceof Error ? cause.message : String(cause),
      event: "model.fallback.create_failed",
      modelId: next.modelId,
      module: "core.runtime",
      providerId: next.providerId,
      status: "failed",
    });
    return false;
  }

  await input.abandonStreaming();
  await runtime.persistAssistantMessage(
    input.assistantMessageId,
    input.state.userMessageId,
    input.assistantCreatedAt,
    {
      completed: Date.now(),
      finish: "model_fallback_discarded",
    },
    input.modelTraceContext,
    input.state.model,
  );
  input.state.modelResponse = "";
  input.state.modelStepCount += 1;
  recordModelHistoryRound(input.state);
  input.state.turnMachine = new TurnMachineImpl(input.state.turnMachine.receiveModelResponse(""));
  input.state.turnMachine = new TurnMachineImpl(input.state.turnMachine.aggregateResults());
  input.state.model = model;
  input.state.modelFallbackTried = dedupeTried([...tried, current, next]);

  if (input.state.modelSelectionScope === "execution") {
    runtime.logger?.info("Model fallback applied inside an execution-scoped turn", {
      event: "model.fallback.applied",
      modelId: next.modelId,
      module: "core.runtime",
      providerId: next.providerId,
      scope: "execution",
      status: "completed",
    });
    return true;
  }

  const previousSelection = runtime.getSessionModelSelection();
  runtime.setSessionModelSelection(selection);
  await persistRuntimeModelSelection(runtime, selection);
  await runtime.emitModelSelected({
    model,
    modelSelection: selection,
    effectiveReasoningLevel: model.options.reasoningLevel,
    origin: "turnFallback",
    previousModelSelection: previousSelection,
    supportedThoughtLevels: model.optionSpecs.reasoningLevel.values,
    traceContext: input.modelTraceContext,
  });
  runtime.logger?.info("Model fallback applied for the rest of the turn", {
    event: "model.fallback.applied",
    fromModelId: current.modelId,
    fromProviderId: current.providerId,
    modelId: next.modelId,
    module: "core.runtime",
    providerId: next.providerId,
    status: "completed",
  });
  return true;
}

function dedupeTried(refs: readonly { providerId: string; modelId: string }[] | undefined) {
  const seen = new Set<string>();
  const next: { providerId: string; modelId: string }[] = [];
  for (const ref of refs ?? []) {
    const key = modelFallbackKey(ref);
    if (seen.has(key)) continue;
    seen.add(key);
    next.push(ref);
  }
  return next;
}
