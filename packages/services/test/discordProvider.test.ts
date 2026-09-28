import assert from "node:assert/strict";
import test from "node:test";
import { parseDiscordDispatch } from "../src/bots/providers/discordProvider.js";

test("解析 Discord 私聊文本并带上 channel id", () => {
  const messages = parseDiscordDispatch("bot-1", {
    t: "MESSAGE_CREATE",
    d: {
      id: "m1",
      content: "/bind abc",
      channel_id: "c1",
      channel: { id: "c1", type: 1 },
      author: { id: "u1", username: "alice", bot: false },
    },
  });
  assert.equal(messages.length, 1);
  assert.equal(messages[0]?.text, "/bind abc");
  assert.equal(messages[0]?.actor.providerUserId, "u1");
  assert.equal(messages[0]?.actor.chatId, "c1");
  assert.equal(messages[0]?.actor.chatType, "private");
});

test("忽略机器人自己的消息", () => {
  const messages = parseDiscordDispatch(
    "bot-1",
    {
      t: "MESSAGE_CREATE",
      d: {
        id: "m1",
        content: "hello",
        channel_id: "c1",
        author: { id: "bot-user", username: "kcode", bot: true },
      },
    },
    "bot-user",
  );
  assert.equal(messages.length, 0);
});
