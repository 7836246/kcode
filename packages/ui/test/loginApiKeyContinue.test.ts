import assert from "node:assert/strict";
import test from "node:test";
import type { LoginApiKeyTemplate } from "../src/login/LoginApiKeyForm.helpers.js";
import {
  connectLoginApiKeyProvider,
  type ConnectLoginApiKeyProviderDeps,
} from "../src/login/loginApiKeyContinue.js";

const template = {
  templateId: "openai",
  config: { access: { type: "api-key" } },
} as LoginApiKeyTemplate;

function createDeps(
  overrides: Partial<ConnectLoginApiKeyProviderDeps> = {},
): ConnectLoginApiKeyProviderDeps & {
  deleted: string[];
  created: number;
} {
  const deleted: string[] = [];
  let created = 0;
  const deps: ConnectLoginApiKeyProviderDeps & { deleted: string[]; created: number } = {
    deleted,
    get created() {
      return created;
    },
    listTemplates: async () => [template],
    createPersonalProvider: async () => {
      created += 1;
      return { providerId: `provider-${created}` };
    },
    deletePersonalProvider: async (providerId) => {
      deleted.push(providerId);
    },
    readModelId: async () => "gpt-test",
    ensureConversationWorkspace: async () => ({ path: "/tmp/kcode-conversation" }),
    testModelConnectivity: async () => ({ success: true }),
    ...overrides,
  };
  return deps;
}

test("测通后才算保存成功", async () => {
  const deps = createDeps();
  const result = await connectLoginApiKeyProvider(
    { apiKey: "sk-test", templateId: "openai", previousProviderId: null },
    deps,
  );
  assert.deepEqual(result, { status: "saved", providerId: "provider-1", modelId: "gpt-test" });
});

test("Key 被拒绝时留下供应商并不算完成", async () => {
  const deps = createDeps({
    testModelConnectivity: async () => ({
      success: false,
      error: { message: "401 Unauthorized" },
    }),
  });
  const result = await connectLoginApiKeyProvider(
    { apiKey: "sk-bad", templateId: "openai", previousProviderId: null },
    deps,
  );
  assert.equal(result.status, "failed");
  if (result.status !== "failed") return;
  assert.equal(result.kind, "auth");
  assert.equal(result.providerId, "provider-1");
});

test("地址不可达不归成密钥错误", async () => {
  const deps = createDeps({
    testModelConnectivity: async () => ({
      success: false,
      error: { message: "getaddrinfo ENOTFOUND api.example.com" },
    }),
  });
  const result = await connectLoginApiKeyProvider(
    { apiKey: "sk-test", templateId: "openai", previousProviderId: null },
    deps,
  );
  assert.equal(result.status, "failed");
  if (result.status !== "failed") return;
  assert.equal(result.kind, "endpoint");
});

test("没有默认模型时归为模型失败", async () => {
  const deps = createDeps({
    readModelId: async () => null,
  });
  const result = await connectLoginApiKeyProvider(
    { apiKey: "sk-test", templateId: "openai", previousProviderId: null },
    deps,
  );
  assert.deepEqual(result, {
    status: "failed",
    kind: "model",
    providerId: "provider-1",
    detail: "",
  });
});

test("再次继续会先删掉上一把 Key", async () => {
  const deps = createDeps();
  await connectLoginApiKeyProvider(
    { apiKey: "sk-next", templateId: "openai", previousProviderId: "provider-old" },
    deps,
  );
  assert.deepEqual(deps.deleted, ["provider-old"]);
});

test("删除失败时不创建新供应商", async () => {
  let created = 0;
  const deps = createDeps({
    createPersonalProvider: async () => {
      created += 1;
      return { providerId: "should-not-exist" };
    },
    deletePersonalProvider: async () => {
      throw new Error("delete failed");
    },
  });
  const result = await connectLoginApiKeyProvider(
    { apiKey: "sk-test", templateId: "openai", previousProviderId: "provider-old" },
    deps,
  );
  assert.equal(created, 0);
  assert.equal(result.status, "failed");
  if (result.status !== "failed") return;
  assert.equal(result.providerId, "provider-old");
});

test("环境没有探测能力时仍算保存成功", async () => {
  const deps = createDeps({
    testModelConnectivity: async () => {
      throw new Error("当前 Environment 未装配模型连通性测试能力");
    },
  });
  const result = await connectLoginApiKeyProvider(
    { apiKey: "sk-test", templateId: "openai", previousProviderId: null },
    deps,
  );
  assert.equal(result.status, "saved");
});
