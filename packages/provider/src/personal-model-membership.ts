import type { ModelId } from "./config/ids.js";

function uniqueInOrder(values: readonly string[]): string[] {
  const result: string[] = [];
  for (const value of values) {
    const normalized = value.trim();
    if (!normalized || result.includes(normalized)) continue;
    result.push(normalized);
  }
  return result;
}

export function normalizeHiddenInheritedModelIds(
  inheritedModelIds: readonly ModelId[],
  hiddenInheritedModelIds?: readonly ModelId[] | null,
): ModelId[] {
  const inherited = new Set(uniqueInOrder(inheritedModelIds));
  return uniqueInOrder(hiddenInheritedModelIds ?? []).filter((modelId) => inherited.has(modelId));
}

export function resolveVisibleInheritedModelIds(
  inheritedModelIds: readonly ModelId[],
  hiddenInheritedModelIds?: readonly ModelId[] | null,
): ModelId[] {
  const hidden = new Set(normalizeHiddenInheritedModelIds(inheritedModelIds, hiddenInheritedModelIds));
  return uniqueInOrder(inheritedModelIds).filter((modelId) => !hidden.has(modelId));
}

export type PersonalModelDeletionPlan =
  | { readonly kind: "personal"; readonly nextPersonalModelIds: readonly ModelId[] }
  | { readonly kind: "inherited"; readonly nextHiddenInheritedModelIds: readonly ModelId[] };

export function resolvePersonalModelDeletionPlan(input: {
  readonly modelId: ModelId;
  readonly inheritedModelIds: readonly ModelId[];
  readonly personalModelIds: readonly ModelId[];
  readonly hiddenInheritedModelIds?: readonly ModelId[] | null;
}): PersonalModelDeletionPlan {
  const modelId = input.modelId.trim();
  const inherited = uniqueInOrder(input.inheritedModelIds);
  const personal = uniqueInOrder(input.personalModelIds);
  if (personal.includes(modelId)) {
    return {
      kind: "personal",
      nextPersonalModelIds: personal.filter((candidate) => candidate !== modelId),
    };
  }
  if (inherited.includes(modelId)) {
    return {
      kind: "inherited",
      nextHiddenInheritedModelIds: normalizeHiddenInheritedModelIds(inherited, [
        ...(input.hiddenInheritedModelIds ?? []),
        modelId,
      ]),
    };
  }
  throw new Error(`Model 不存在: ${modelId}`);
}

export interface RemoteModelImportPlan {
  readonly nextPersonalModelIds: readonly ModelId[];
  readonly nextHiddenInheritedModelIds: readonly ModelId[];
  readonly addedModelIds: readonly ModelId[];
  readonly restoredInheritedModelIds: readonly ModelId[];
  readonly skippedModelIds: readonly ModelId[];
}

/** 远端目录只合并进当前实例：恢复仍在远端的已隐藏模板模型，并追加全新个人模型。 */
export function resolveRemoteModelImportPlan(input: {
  readonly remoteModelIds: readonly ModelId[];
  readonly inheritedModelIds: readonly ModelId[];
  readonly personalModelIds: readonly ModelId[];
  readonly hiddenInheritedModelIds?: readonly ModelId[] | null;
}): RemoteModelImportPlan {
  const inherited = uniqueInOrder(input.inheritedModelIds);
  const inheritedSet = new Set(inherited);
  const personal = uniqueInOrder(input.personalModelIds);
  const personalSet = new Set(personal);
  const hidden = new Set(normalizeHiddenInheritedModelIds(inherited, input.hiddenInheritedModelIds));
  const addedModelIds: ModelId[] = [];
  const restoredInheritedModelIds: ModelId[] = [];
  const skippedModelIds: ModelId[] = [];

  for (const remoteId of uniqueInOrder(input.remoteModelIds)) {
    if (hidden.has(remoteId)) {
      hidden.delete(remoteId);
      restoredInheritedModelIds.push(remoteId);
      continue;
    }
    if (inheritedSet.has(remoteId) || personalSet.has(remoteId)) {
      skippedModelIds.push(remoteId);
      continue;
    }
    personal.push(remoteId);
    personalSet.add(remoteId);
    addedModelIds.push(remoteId);
  }

  return {
    nextPersonalModelIds: personal,
    nextHiddenInheritedModelIds: [...hidden],
    addedModelIds,
    restoredInheritedModelIds,
    skippedModelIds,
  };
}
