import assert from "node:assert/strict";
import test from "node:test";
import {
  computeWecomSignature,
  decryptWecomCiphertext,
  encryptWecomPlaintext,
  readWecomXmlCdata,
} from "../src/bots/providers/wecomCrypto.js";
import { createWecomBotProvider } from "../src/bots/providers/wecomProvider.js";
import type { BotConfig } from "@kcode/shared";

const ENCODING_AES_KEY = "BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc";
const TOKEN = "QDG6eK";
const CORP_ID = "wx5823bf96d3bd56c7";

test("企业微信加解密往返并校验 Corp ID", () => {
  const xml = "<xml><Content><![CDATA[hello]]></Content></xml>";
  const cipher = encryptWecomPlaintext(ENCODING_AES_KEY, CORP_ID, xml);
  assert.equal(decryptWecomCiphertext(ENCODING_AES_KEY, CORP_ID, cipher), xml);
});

test("错误签名会被拒绝", async () => {
  const provider = createWecomBotProvider({
    loadCredential: async (key) => (key.includes("webhook") ? ENCODING_AES_KEY : "secret"),
  });
  const bot = {
    id: "bot-1",
    provider: "wecom",
    enabled: true,
    wecomCorpId: CORP_ID,
    wecomAgentId: "1000002",
    wecomCallbackToken: TOKEN,
    credentialRef: "cred",
    webhookSecretRef: "webhook",
  } as BotConfig;
  await assert.rejects(
    () =>
      provider.handleCallbackResponse?.(bot, {
        method: "GET",
        msg_signature: "deadbeef",
        timestamp: "1409659813",
        nonce: "1372623149",
        echostr: encryptWecomPlaintext(ENCODING_AES_KEY, CORP_ID, "ping"),
      }),
  );
});

test("文本回调解析 FromUserName 和 Content", async () => {
  const xml = `<xml><ToUserName><![CDATA[to]]></ToUserName><FromUserName><![CDATA[zhangsan]]></FromUserName><MsgType><![CDATA[text]]></MsgType><Content><![CDATA[/bind abc]]></Content><MsgId>123</MsgId></xml>`;
  const encrypt = encryptWecomPlaintext(ENCODING_AES_KEY, CORP_ID, xml);
  const timestamp = "1409659813";
  const nonce = "1372623149";
  const signature = computeWecomSignature(TOKEN, timestamp, nonce, encrypt);
  const provider = createWecomBotProvider({
    loadCredential: async (key) => (key.includes("webhook") ? ENCODING_AES_KEY : "secret"),
  });
  const bot = {
    id: "bot-1",
    provider: "wecom",
    enabled: true,
    wecomCorpId: CORP_ID,
    wecomAgentId: "1000002",
    wecomCallbackToken: TOKEN,
    credentialRef: "cred",
    webhookSecretRef: "webhook",
  } as BotConfig;
  const prepared = await provider.prepareCallbackPayload?.(bot, {
    botId: "bot-1",
    method: "POST",
    msg_signature: signature,
    timestamp,
    nonce,
    rawBody: `<xml><Encrypt><![CDATA[${encrypt}]]></Encrypt></xml>`,
  });
  const messages = provider.parseCallback(prepared);
  assert.equal(messages.length, 1);
  assert.equal(messages[0]?.text, "/bind abc");
  assert.equal(messages[0]?.actor.providerUserId, "zhangsan");
  assert.equal(readWecomXmlCdata(xml, "MsgType"), "text");
});
