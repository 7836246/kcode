import assert from "node:assert/strict";
import test from "node:test";
import { parseDingdingCallback } from "../src/bots/providers/dingdingProvider.js";

test("解析钉钉单聊文本得到 staffId", () => {
  const messages = parseDingdingCallback("bot-1", {
    data: JSON.stringify({
      conversationType: "1",
      senderStaffId: "manager1",
      senderNick: "张三",
      conversationId: "cid-private",
      msgId: "m1",
      text: { content: "/bind abc" },
    }),
  });
  assert.equal(messages.length, 1);
  assert.equal(messages[0]?.text, "/bind abc");
  assert.equal(messages[0]?.actor.providerUserId, "manager1");
  assert.equal(messages[0]?.actor.chatType, "private");
  assert.equal(messages[0]?.actor.chatId, undefined);
});

test("解析钉钉群聊文本带上 conversationId", () => {
  const messages = parseDingdingCallback("bot-1", {
    data: {
      conversationType: "2",
      senderStaffId: "manager1",
      conversationId: "cidABCDEF==",
      text: { content: "hello" },
    },
  });
  assert.equal(messages.length, 1);
  assert.equal(messages[0]?.actor.chatType, "group");
  assert.equal(messages[0]?.actor.chatId, "cidABCDEF==");
});
