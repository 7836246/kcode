import assert from "node:assert/strict";
import test from "node:test";
import type { ModelSelection } from "@kcode/shared";
import { resolveComposerModelSelection } from "../src/v4/composer/composerSubmissionConfig.js";

const providerA: ModelSelection = {
  providerId: "provider-a",
  modelId: "model-a",
  options: { reasoningLevel: "high" },
};

const providerB: ModelSelection = {
  providerId: "provider-b",
  modelId: "model-b",
  options: { reasoningLevel: "medium" },
};

const remappedA: ModelSelection = {
  providerId: "provider-a",
  modelId: "model-a",
  options: { reasoningLevel: "high" },
};

test("切模后 View 仍停在旧选型时保留草稿意图", () => {
  assert.deepEqual(resolveComposerModelSelection(providerB, providerA), providerB);
});

test("View 未就绪时使用草稿意图", () => {
  assert.deepEqual(resolveComposerModelSelection(providerB, null), providerB);
  assert.deepEqual(resolveComposerModelSelection(providerB, undefined), providerB);
});

test("同身份时优先 View（账号重映射/档位补全）", () => {
  assert.deepEqual(resolveComposerModelSelection(providerA, remappedA), remappedA);
});

test("无草稿意图时回退 View", () => {
  assert.deepEqual(resolveComposerModelSelection(null, providerA), providerA);
  assert.equal(resolveComposerModelSelection(undefined, null), undefined);
});
