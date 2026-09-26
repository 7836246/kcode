import assert from "node:assert/strict";
import test from "node:test";
import {
  lookupPublicModelInfo,
  resetPublicModelCatalogStateForTests,
} from "../src/model-provider/modelInfoCatalogFetch.js";

test.afterEach(() => {
  resetPublicModelCatalogStateForTests();
});

test("HTTP 明确失败后本次进程不再打该源", async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return new Response("no", { status: 503 });
  };
  assert.equal(await lookupPublicModelInfo("gpt-test", fetchImpl), undefined);
  assert.equal(await lookupPublicModelInfo("gpt-test", fetchImpl), undefined);
  assert.equal(calls, 3);
});

test("超时或网络错误下次仍可重试", async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    throw new Error("network down");
  };
  assert.equal(await lookupPublicModelInfo("gpt-test", fetchImpl), undefined);
  assert.equal(await lookupPublicModelInfo("gpt-test", fetchImpl), undefined);
  assert.equal(calls, 6);
});
