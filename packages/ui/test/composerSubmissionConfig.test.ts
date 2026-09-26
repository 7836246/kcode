import assert from "node:assert/strict";
import test from "node:test";
import type { ModelSelection } from "@kcode/shared";
import {
  resolveComposerModelSelection,
  shouldAlignSessionModelBeforeSend,
} from "../src/v4/composer/composerSubmissionConfig.js";

const individualPlan: ModelSelection = {
  providerId: "account:zai-individual-coding-plan",
  modelId: "glm-4.6",
  options: { reasoningLevel: "high" },
};

const teamPlan: ModelSelection = {
  providerId: "account:zai-team-coding-plan",
  modelId: "glm-4.6",
  options: { reasoningLevel: "high" },
};

const providerB: ModelSelection = {
  providerId: "provider-b",
  modelId: "model-b",
  options: { reasoningLevel: "medium" },
};

test("View 未就绪时使用草稿意图", () => {
  assert.deepEqual(resolveComposerModelSelection(providerB, null), providerB);
  assert.deepEqual(resolveComposerModelSelection(providerB, undefined), providerB);
});

test("账号套餐重映射后即使 providerId 变了也采用 View", () => {
  assert.deepEqual(
    resolveComposerModelSelection(individualPlan, { effectiveSelection: teamPlan }),
    teamPlan,
  );
});

test("同身份时优先 View 的档位补全", () => {
  const completed: ModelSelection = {
    ...providerB,
    options: { reasoningLevel: "high" },
  };
  assert.deepEqual(
    resolveComposerModelSelection(providerB, { effectiveSelection: completed }),
    completed,
  );
});

test("无草稿意图时回退 View", () => {
  assert.deepEqual(
    resolveComposerModelSelection(null, { effectiveSelection: individualPlan }),
    individualPlan,
  );
  assert.equal(resolveComposerModelSelection(undefined, null), undefined);
});

test("View 报 selectionIssue 且没有 effectiveSelection 时不回落未映射草稿", () => {
  assert.equal(
    resolveComposerModelSelection(individualPlan, {
      effectiveSelection: undefined,
      selectionIssue: "account-connection-unavailable",
    }),
    undefined,
  );
});

test("进行中的回合不在发送前改共享 Session 选型", () => {
  assert.equal(shouldAlignSessionModelBeforeSend("running"), false);
  assert.equal(shouldAlignSessionModelBeforeSend("prewarming"), false);
  assert.equal(shouldAlignSessionModelBeforeSend("draft"), true);
  assert.equal(shouldAlignSessionModelBeforeSend("completedSuccess"), true);
  assert.equal(shouldAlignSessionModelBeforeSend(undefined), true);
});
