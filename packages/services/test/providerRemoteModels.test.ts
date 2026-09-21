import assert from "node:assert/strict";
import test from "node:test";
import {
  resolvePersonalModelDeletionPlan,
  resolveRemoteModelImportPlan,
} from "@kcode/provider";
import {
  parseProviderRemoteModelIds,
  resolveProviderModelsUrl,
} from "../src/model-provider/providerRemoteModels.js";

test("openai-compatible baseUrl 追加 /models，且不会重复", () => {
  assert.equal(
    resolveProviderModelsUrl("openai-responses", "https://api.x.ai/v1"),
    "https://api.x.ai/v1/models",
  );
  assert.equal(
    resolveProviderModelsUrl("openai-chat-completions", "https://api.openai.com/v1/models"),
    "https://api.openai.com/v1/models",
  );
});

test("anthropic baseUrl 在缺少 /v1 时补上 /v1/models", () => {
  assert.equal(
    resolveProviderModelsUrl("anthropic-messages", "https://api.anthropic.com"),
    "https://api.anthropic.com/v1/models",
  );
  assert.equal(
    resolveProviderModelsUrl("anthropic-messages", "https://api.anthropic.com/v1"),
    "https://api.anthropic.com/v1/models",
  );
});

test("识别 OpenAI / Anthropic 风格的模型目录 JSON", () => {
  assert.deepEqual(
    parseProviderRemoteModelIds({
      data: [{ id: "grok-4.6" }, { id: "grok-4.3" }, { id: "grok-4.6" }],
    }),
    ["grok-4.6", "grok-4.3"],
  );
  assert.deepEqual(parseProviderRemoteModelIds({ models: ["a", { id: "b" }] }), ["a", "b"]);
});

test("删除模板继承模型只写入隐藏名单，不改个人成员", () => {
  assert.deepEqual(
    resolvePersonalModelDeletionPlan({
      modelId: "grok-4.6",
      inheritedModelIds: ["grok-4.6", "grok-4.3"],
      personalModelIds: ["custom-1"],
      hiddenInheritedModelIds: [],
    }),
    { kind: "inherited", nextHiddenInheritedModelIds: ["grok-4.6"] },
  );
});

test("获取远端列表会恢复已隐藏的模板模型，并追加全新个人模型", () => {
  const plan = resolveRemoteModelImportPlan({
    remoteModelIds: ["grok-4.6", "grok-new"],
    inheritedModelIds: ["grok-4.6", "grok-4.3"],
    personalModelIds: ["custom-1"],
    hiddenInheritedModelIds: ["grok-4.6"],
  });
  assert.deepEqual(plan.nextHiddenInheritedModelIds, []);
  assert.deepEqual(plan.restoredInheritedModelIds, ["grok-4.6"]);
  assert.deepEqual(plan.addedModelIds, ["grok-new"]);
  assert.deepEqual(plan.nextPersonalModelIds, ["custom-1", "grok-new"]);
  assert.deepEqual(plan.skippedModelIds, []);
});

test("只导入勾选的远端模型，未勾选的不写盘", () => {
  const plan = resolveRemoteModelImportPlan({
    remoteModelIds: ["grok-new"],
    inheritedModelIds: ["grok-4.6"],
    personalModelIds: ["custom-1"],
    hiddenInheritedModelIds: ["grok-4.6"],
  });
  assert.deepEqual(plan.addedModelIds, ["grok-new"]);
  assert.deepEqual(plan.restoredInheritedModelIds, []);
  assert.deepEqual(plan.nextHiddenInheritedModelIds, ["grok-4.6"]);
  assert.deepEqual(plan.nextPersonalModelIds, ["custom-1", "grok-new"]);
});

test("空勾选等价于不改成员", () => {
  const plan = resolveRemoteModelImportPlan({
    remoteModelIds: [],
    inheritedModelIds: ["grok-4.6"],
    personalModelIds: ["custom-1"],
    hiddenInheritedModelIds: [],
  });
  assert.deepEqual(plan.addedModelIds, []);
  assert.deepEqual(plan.restoredInheritedModelIds, []);
  assert.deepEqual(plan.nextPersonalModelIds, ["custom-1"]);
  assert.deepEqual(plan.nextHiddenInheritedModelIds, []);
});
