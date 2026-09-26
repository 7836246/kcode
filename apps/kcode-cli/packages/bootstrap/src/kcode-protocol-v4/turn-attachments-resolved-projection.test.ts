import assert from "node:assert/strict";
import test from "node:test";
import {
  createSessionEvent,
  SessionEventType,
  type MessageId,
  type SessionId,
  type TraceId,
  type TurnId,
  // 直接用契约类型，别再在测试里手写窄化副本：漏掉 truncated/totalLines 时会先在这里编译失败，
  // 而不是把「自带截断事实」这条用例悄悄变成不可编译。
  type TurnAttachmentMeta,
} from "@kcode/contracts";
import type { UserInputRow } from "@kcode/shared/kcode-protocol-v4";
import { ProductProjection } from "./product-projection.js";

const sessionId = "session-attachments" as SessionId;
const turnId = "turn-1" as TurnId;
const traceId = "trace-attachments" as TraceId;

const ATTACHMENT = {
  fileName: "AGENTS.md",
  mime: "text/plain",
  bytes: 4_096,
  ref: "/tmp/AGENTS.md",
};

function projectionWithAttachment(): ProductProjection {
  const target = new ProductProjection(sessionId, "turn-attachments-test");
  target.applyEvent(
    createSessionEvent(
      SessionEventType.TurnStarted,
      sessionId,
      {
        turnNumber: 1,
        input: "看看这个文件",
        messageId: "msg-1" as MessageId,
        attachments: [ATTACHMENT],
      },
      { turnId, traceId, sequenceNumber: 1 },
    ),
  );
  return target;
}

function attachmentOf(
  target: ProductProjection,
): UserInputRow["attachments"] extends readonly (infer T)[] | undefined ? T : never {
  const row = target
    .getSnapshot()
    .rows.window.find((candidate): candidate is UserInputRow => candidate.kind === "userInput");
  assert.ok(row);
  const attachment = row.attachments?.[0];
  assert.ok(attachment);
  return attachment as never;
}

test("TurnStarted 阶段不带截断事实（缺省即未知）", () => {
  const attachment = attachmentOf(projectionWithAttachment());
  assert.equal(attachment.truncated, undefined);
  assert.equal(attachment.totalLines, undefined);
});

test("turn_attachments_resolved 补上截断事实，且不改既有展示字段", () => {
  const target = projectionWithAttachment();
  target.applyEvent(
    createSessionEvent(
      SessionEventType.TurnAttachmentsResolved,
      sessionId,
      {
        attachments: [{ ...ATTACHMENT, truncated: true, totalLines: 4_000 }],
      },
      { turnId, traceId, sequenceNumber: 2 },
    ),
  );

  const attachment = attachmentOf(target);
  assert.equal(attachment.truncated, true);
  assert.equal(attachment.totalLines, 4_000);
  assert.equal(attachment.fileName, ATTACHMENT.fileName);
  assert.equal(attachment.mime, ATTACHMENT.mime);
  assert.equal(attachment.bytes, ATTACHMENT.bytes);
  assert.equal(attachment.ref, ATTACHMENT.ref);
});

test("未截断的附件不写入截断字段", () => {
  const target = projectionWithAttachment();
  target.applyEvent(
    createSessionEvent(
      SessionEventType.TurnAttachmentsResolved,
      sessionId,
      { attachments: [ATTACHMENT] },
      { turnId, traceId, sequenceNumber: 2 },
    ),
  );

  const attachment = attachmentOf(target);
  assert.equal(attachment.truncated, undefined);
  assert.equal(attachment.totalLines, undefined);
});

test("该轮没有附件时不产生附件字段", () => {
  const target = new ProductProjection(sessionId, "turn-attachments-empty");
  target.applyEvent(
    createSessionEvent(
      SessionEventType.TurnStarted,
      sessionId,
      { turnNumber: 1, input: "没有附件", messageId: "msg-2" as MessageId },
      { turnId, traceId, sequenceNumber: 1 },
    ),
  );
  target.applyEvent(
    createSessionEvent(
      SessionEventType.TurnAttachmentsResolved,
      sessionId,
      { attachments: [ATTACHMENT] },
      { turnId, traceId, sequenceNumber: 2 },
    ),
  );

  const row = target
    .getSnapshot()
    .rows.window.find((candidate): candidate is UserInputRow => candidate.kind === "userInput");
  assert.ok(row);
  assert.equal(row.attachments, undefined);
});

const GUIDE_TURN_ID = "turn-guide" as TurnId;
const GUIDE_ATTACHMENT_REF = {
  ref: "/tmp/guide-report.md",
  fileName: "guide-report.md",
  mime: "text/plain",
  bytes: 8_192,
};

/**
 * guide 内联输入没有自己那一轮的 turn_attachments_resolved 补发，
 * 截断事实必须由 TurnSteerDrained 的 drainedInputs[].attachments 自带。
 */
function projectionWithGuideDrain(options: {
  attachmentRefs?: typeof GUIDE_ATTACHMENT_REF[];
  attachments?: TurnAttachmentMeta[];
  delivery: "guide" | "queue";
}): ProductProjection {
  const target = new ProductProjection(sessionId, "turn-steer-drain-test");
  target.applyEvent(
    createSessionEvent(
      SessionEventType.TurnStarted,
      sessionId,
      { turnNumber: 1, input: "原始输入", messageId: "msg-3" as MessageId },
      { turnId: GUIDE_TURN_ID, traceId, sequenceNumber: 1 },
    ),
  );
  target.applyEvent(
    createSessionEvent(
      SessionEventType.TurnSteerDrained,
      sessionId,
      {
        pendingInputIds: ["steer-1"],
        injectedMessageIds: ["msg-4" as MessageId],
        targetTurnId: GUIDE_TURN_ID,
        drainedInputs: [
          {
            pendingInputId: "steer-1",
            messageId: "msg-4" as MessageId,
            text: "引导输入",
            delivery: options.delivery,
            ...(options.attachmentRefs?.length
              ? { intent: { attachmentRefs: options.attachmentRefs } }
              : {}),
            ...(options.attachments?.length ? { attachments: options.attachments } : {}),
          },
        ],
      },
      { turnId: GUIDE_TURN_ID, traceId, sequenceNumber: 2 },
    ),
  );
  return target;
}

function rowsOf(target: ProductProjection): UserInputRow[] {
  return target
    .getSnapshot()
    .rows.window.filter((candidate): candidate is UserInputRow => candidate.kind === "userInput");
}

test("guide drain 自带截断事实，并保留 intent 附件的 ref 字段", () => {
  const target = projectionWithGuideDrain({
    attachmentRefs: [GUIDE_ATTACHMENT_REF],
    attachments: [{ ...GUIDE_ATTACHMENT_REF, truncated: true, totalLines: 2_048 }],
    delivery: "guide",
  });

  const guidedRow = rowsOf(target).find((row) => row.guided === true);
  assert.ok(guidedRow);
  const attachment = guidedRow.attachments?.[0];
  assert.ok(attachment);
  assert.equal(attachment.truncated, true);
  assert.equal(attachment.totalLines, 2_048);
  assert.equal(attachment.ref, GUIDE_ATTACHMENT_REF.ref);
  assert.equal(attachment.fileName, GUIDE_ATTACHMENT_REF.fileName);
});

test("guide drain 无 intent 附件引用时直接采用自带元信息", () => {
  const target = projectionWithGuideDrain({
    attachments: [{ ...ATTACHMENT, truncated: true, totalLines: 4_000 }],
    delivery: "guide",
  });

  const guidedRow = rowsOf(target).find((row) => row.guided === true);
  assert.ok(guidedRow);
  const attachment = guidedRow.attachments?.[0];
  assert.ok(attachment);
  assert.equal(attachment.truncated, true);
  assert.equal(attachment.totalLines, 4_000);
  assert.equal(attachment.fileName, ATTACHMENT.fileName);
});

test("guide drain 附件未截断时不写入截断字段，原输入行不受影响", () => {
  const target = projectionWithGuideDrain({
    attachmentRefs: [GUIDE_ATTACHMENT_REF],
    attachments: [{ ...GUIDE_ATTACHMENT_REF }],
    delivery: "guide",
  });

  const guidedRow = rowsOf(target).find((row) => row.guided === true);
  assert.ok(guidedRow);
  const attachment = guidedRow.attachments?.[0];
  assert.ok(attachment);
  assert.equal(attachment.truncated, undefined);
  assert.equal(attachment.totalLines, undefined);
  const originalRow = rowsOf(target).find((row) => row.text === "原始输入");
  assert.ok(originalRow);
  assert.equal(originalRow.attachments, undefined);
});

test("drainedInputs 不带附件时保持旧行为（无附件字段）", () => {
  const target = projectionWithGuideDrain({ delivery: "guide" });

  const guidedRow = rowsOf(target).find((row) => row.guided === true);
  assert.ok(guidedRow);
  assert.equal(guidedRow.attachments, undefined);
});
