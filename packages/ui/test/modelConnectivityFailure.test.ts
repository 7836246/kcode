import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyModelConnectivityFailure,
  resolveConnectivityFailureCopy,
} from "../src/lib/modelConnectivityFailure.js";

test("401 和无效密钥归为 Key", () => {
  assert.equal(classifyModelConnectivityFailure("401 Unauthorized"), "auth");
  assert.equal(classifyModelConnectivityFailure("Incorrect API key provided"), "auth");
  assert.equal(classifyModelConnectivityFailure("认证失败"), "auth");
});

test("连不上地址归为接口", () => {
  assert.equal(
    classifyModelConnectivityFailure("getaddrinfo ENOTFOUND api.example.com"),
    "endpoint",
  );
  assert.equal(classifyModelConnectivityFailure("Request timed out after 60000ms"), "endpoint");
  assert.equal(classifyModelConnectivityFailure("未配置 endpoint"), "endpoint");
});

test("模型不存在单独分类", () => {
  assert.equal(classifyModelConnectivityFailure("model_not_found"), "model");
  assert.equal(classifyModelConnectivityFailure("The model gpt-x does not exist"), "model");
});

test("认不出的句子保持原文", () => {
  assert.equal(classifyModelConnectivityFailure(""), "other");
  assert.equal(classifyModelConnectivityFailure("模型连通性测试流在 finish 事件前结束"), "other");
  assert.deepEqual(
    resolveConnectivityFailureCopy({ message: "模型连通性测试流在 finish 事件前结束" }),
    { raw: "模型连通性测试流在 finish 事件前结束" },
  );
});

test("资格失败沿用设置页已有文案", () => {
  assert.deepEqual(
    resolveConnectivityFailureCopy({
      code: "model-unavailable",
      message: "This model is currently unavailable for connectivity testing.",
    }),
    { messageId: "settings.modelProvider.testModel.modelUnavailable" },
  );
});
