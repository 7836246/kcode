import assert from "node:assert/strict";
import test from "node:test";
import { ModelConfig } from "@kcode/provider";
import {
  findModelsDevInfo,
  mergeCatalogModelInfo,
  modelConfigFromCatalog,
  parseProviderModelCatalog,
} from "../src/model-provider/modelInfoCatalog.js";

test("供应商模型响应里的上下文和视觉能力会被保留", () => {
  const catalog = parseProviderModelCatalog({
    data: [
      {
        id: "model-b",
        context_window: 128000,
        max_completion_tokens: 32768,
        capabilities: ["reasoning", "tools"],
        architecture: { input_modalities: ["text", "image"] },
      },
      { id: "model-a", max_output_tokens: 8192 },
    ],
  });

  assert.deepEqual(catalog.modelIds, ["model-b", "model-a"]);
  assert.equal(catalog.info["model-b"]?.contextWindow, 128000);
  assert.equal(catalog.info["model-b"]?.maxOutputTokens, 32768);
  assert.equal(catalog.info["model-b"]?.supportsImage, true);
  assert.equal(catalog.info["model-b"]?.supportsToolCall, true);
  assert.equal(catalog.info["model-a"]?.maxOutputTokens, 8192);
});

test("公开目录只补供应商没给的字段", () => {
  const merged = mergeCatalogModelInfo(
    { contextWindow: 128000, supportsToolCall: true },
    { contextWindow: 64000, maxOutputTokens: 16384, supportsImage: true },
  );
  assert.equal(merged.contextWindow, 128000);
  assert.equal(merged.maxOutputTokens, 16384);
  assert.equal(merged.supportsImage, true);
  assert.equal(merged.supportsToolCall, true);
});

test("models.dev 按模型 ID 匹配上下文，并跳过已有具体规则的字段", () => {
  const info = findModelsDevInfo(
    {
      openai: {
        models: {
          "gpt-test": {
            id: "gpt-test",
            limit: { context: 200000, output: 32000 },
            tool_call: true,
            modalities: { input: ["text", "image"] },
          },
        },
      },
    },
    "openai/gpt-test",
  );
  assert.equal(info?.contextWindow, 200000);
  assert.equal(info?.supportsImage, true);

  const patch = modelConfigFromCatalog(
    {
      properties: { contextWindow: 1000000 },
      optionSpecs: {
        maxOutputTokens: { max: 32000, map: "{'max_tokens': maxOutputTokens}" },
      },
    },
    info,
  );
  const json = patch?.toJSON();
  assert.equal(json?.properties?.contextWindow, undefined);
  assert.equal(json?.properties?.inputFormat?.supportsImage, true);
  assert.equal(json?.optionSpecs?.maxOutputTokens, undefined);
  assert.ok(patch instanceof ModelConfig);
});

test("公开目录不按前缀把短 ID 匹配到更长的变体", () => {
  const info = findModelsDevInfo(
    {
      openai: {
        models: {
          "gpt-4-turbo-preview": {
            id: "gpt-4-turbo-preview",
            limit: { context: 128000, output: 4096 },
          },
        },
      },
    },
    "gpt-4-turbo",
  );
  assert.equal(info, undefined);
});

test("公开目录在全名或裸 ID 精确对应时仍然命中", () => {
  const catalog = {
    openai: {
      models: {
        "gpt-4-turbo": {
          id: "gpt-4-turbo",
          limit: { context: 128000, output: 4096 },
        },
      },
    },
  };
  assert.equal(findModelsDevInfo(catalog, "gpt-4-turbo")?.contextWindow, 128000);
  assert.equal(findModelsDevInfo(catalog, "openai/gpt-4-turbo")?.contextWindow, 128000);
});
