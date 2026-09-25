import assert from "node:assert/strict";
import test from "node:test";
import {
  createSessionEvent,
  SessionEventType,
  type MessageId,
  type SessionId,
  type TraceId,
  type TurnId,
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
