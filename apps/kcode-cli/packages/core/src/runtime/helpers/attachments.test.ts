import assert from "node:assert/strict";
import test from "node:test";
import {
  isPartialAttachmentTextRead,
  summarizeResolvedTurnAttachmentsForEvent,
} from "./attachments.js";
import type { ResolvedTurnAttachment } from "../types.js";

test("按行数限流的附件读取必须判成截断", () => {
  // 超限文件只取前 2000 行时读取层返回 truncated=false，这里必须补上判定，
  // 否则模型只拿到文件开头，提示词却会声明内容完整。
  assert.equal(
    isPartialAttachmentTextRead({ numLines: 2000, totalLines: 12005, truncated: false }),
    true,
  );
});

test("token 上限硬截的附件读取判成截断", () => {
  assert.equal(
    isPartialAttachmentTextRead({ numLines: 984, totalLines: 12005, truncated: true }),
    true,
  );
});

test("整文件读完不算截断", () => {
  assert.equal(isPartialAttachmentTextRead({ numLines: 2000, totalLines: 2000 }), false);
  assert.equal(
    isPartialAttachmentTextRead({ numLines: 2000, totalLines: 2000, truncated: false }),
    false,
  );
});

test("空文件归一化后的 1/1 不算截断", () => {
  assert.equal(isPartialAttachmentTextRead({ numLines: 1, totalLines: 1 }), false);
});

function resolvedAttachmentOf(preview: { truncated?: boolean; totalLines?: number }) {
  return {
    contentBlock: { type: "text", text: "正文" },
    filename: "测试.md",
    metadata: { preview, sizeBytes: 1024, storageKind: "inline" },
    mime: "text/plain",
    source: { type: "file", path: "/tmp/测试.md", text: { value: "测试.md", start: 0, end: 3 } },
    url: "/tmp/测试.md",
  } as unknown as ResolvedTurnAttachment;
}

test("展示事件元信息带上截断与总行数", () => {
  const metas = summarizeResolvedTurnAttachmentsForEvent([
    resolvedAttachmentOf({ truncated: true, totalLines: 12005 }),
  ]);
  assert.equal(metas?.[0]?.truncated, true);
  assert.equal(metas?.[0]?.totalLines, 12005);
  assert.equal(metas?.[0]?.fileName, "测试.md");
});

test("未截断时不下发截断字段，缺省与 false 保持可区分", () => {
  const metas = summarizeResolvedTurnAttachmentsForEvent([
    resolvedAttachmentOf({ truncated: false, totalLines: 10 }),
  ]);
  assert.equal(metas?.[0]?.truncated, undefined);
  assert.equal(metas?.[0]?.totalLines, undefined);
});
