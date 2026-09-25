import assert from "node:assert/strict";
import test from "node:test";
import type { FilePart } from "@kcode/contracts";
import { promptAttachmentReminderInputForFilePart } from "../agent/session-history-hydrator.js";
import { promptAttachmentInputForResolvedAttachment } from "../runtime/helpers/conversation.js";
import type { ResolvedTurnAttachment } from "../runtime/types.js";
import { buildPromptAttachmentReminderBodies } from "./prompt-attachment.js";

const CONTENT = "# docs 目录写作规范\n\n- 语体：论文语体。";
const PREVIEW = {
  text: CONTENT,
  truncated: false,
  startLine: 1,
  totalLines: 3,
};
const SOURCE = {
  type: "file" as const,
  path: "/Users/someone/Code/project/docs/AGENTS.md",
  text: { value: "docs/AGENTS.md", start: 0, end: 15 },
};

/** 同一份附件在 live（已 resolve）与 hydrate（持久化 file part）两侧的等价夹具。 */
const LIVE_ATTACHMENT = {
  contentBlock: { type: "text", text: CONTENT },
  filename: "AGENTS.md",
  metadata: { storageKind: "inline", recoverability: "provider_ready", preview: PREVIEW },
  mime: "text/plain",
  source: SOURCE,
  url: "docs/AGENTS.md",
} satisfies ResolvedTurnAttachment;

const FILE_PART = {
  type: "file",
  mime: "text/plain",
  filename: "AGENTS.md",
  url: "docs/AGENTS.md",
  source: SOURCE,
  metadata: { storageKind: "inline", recoverability: "provider_ready", preview: PREVIEW },
} satisfies FilePart;

test("live 与 hydrate 产出逐字一致的附件提醒文本", () => {
  const liveInput = promptAttachmentInputForResolvedAttachment(LIVE_ATTACHMENT);
  const hydrateInput = promptAttachmentReminderInputForFilePart(FILE_PART, {
    type: "text",
    text: CONTENT,
  });
  assert.ok(liveInput);
  assert.ok(hydrateInput);
  assert.equal(liveInput.kind, "file");
  assert.equal(hydrateInput.kind, "file");
  assert.deepEqual(hydrateInput, liveInput);
  assert.deepEqual(
    buildPromptAttachmentReminderBodies(hydrateInput),
    buildPromptAttachmentReminderBodies(liveInput),
  );
});

test("两侧都在截断时给出同一份行数说明", () => {
  const truncatedPreview = { ...PREVIEW, truncated: true, totalLines: 4_000 };
  const liveInput = promptAttachmentInputForResolvedAttachment({
    ...LIVE_ATTACHMENT,
    metadata: {
      ...LIVE_ATTACHMENT.metadata,
      recoverability: "preview_only",
      preview: truncatedPreview,
    },
  });
  const hydrateInput = promptAttachmentReminderInputForFilePart(
    {
      ...FILE_PART,
      metadata: {
        ...FILE_PART.metadata,
        recoverability: "preview_only",
        preview: truncatedPreview,
      },
    },
    { type: "text", text: CONTENT },
  );
  assert.ok(liveInput);
  assert.ok(hydrateInput);
  const [body] = buildPromptAttachmentReminderBodies(liveInput);
  assert.ok(body);
  assert.ok(body.includes("- note: truncated to the first 3 of 4000 lines"));
  assert.deepEqual(
    buildPromptAttachmentReminderBodies(hydrateInput),
    buildPromptAttachmentReminderBodies(liveInput),
  );
});
