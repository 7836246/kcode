import assert from "node:assert/strict";
import test from "node:test";
import { getBotProviderRegionTagLabelId } from "../src/botsUi.js";
import zhCN from "../src/i18n/locales/zh-CN.js";
import enUS from "../src/i18n/locales/en-US.js";

test("飞书和 Lark 使用渠道地区文案，不引用已下线的 login.oauth key", () => {
  const feishu = getBotProviderRegionTagLabelId("feishu");
  const lark = getBotProviderRegionTagLabelId("lark");
  assert.equal(feishu, "bots.channel.region.cn");
  assert.equal(lark, "bots.channel.region.international");
  assert.equal(getBotProviderRegionTagLabelId("weixin"), null);
  assert.ok(zhCN[feishu!]);
  assert.ok(zhCN[lark!]);
  assert.ok(enUS[feishu!]);
  assert.ok(enUS[lark!]);
  assert.equal(zhCN[feishu!], "国内");
  assert.equal(zhCN[lark!], "国际");
});
