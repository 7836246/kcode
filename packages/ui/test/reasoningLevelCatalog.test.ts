import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { compileModelOptionMap } from "../../model-option-map/src/index.ts";
import { thoughtLevelLabelId } from "../src/chat-input-toolbar/thoughtLevelLabels.js";
import enUS from "../src/i18n/locales/en-US.js";
import zhCN from "../src/i18n/locales/zh-CN.js";
import {
  REASONING_LEVEL_CATALOG,
  REASONING_LEVEL_PRESETS,
  formatReasoningMapFields,
  matchingReasoningPreset,
  reasoningLevelChange,
  reasoningMapSummary,
  reasoningMapTemplate,
  type ReasoningMapApiType,
} from "../src/settings/model-provider-section/reasoningLevelCatalog.js";

const API_TYPES = [
  "anthropic-messages",
  "openai-chat-completions",
  "openai-responses",
] as const satisfies readonly ReasoningMapApiType[];

test("点选档位都有和聊天相同的中英文名称", () => {
  for (const level of REASONING_LEVEL_CATALOG) {
    const labelId = thoughtLevelLabelId(level);
    assert.ok(labelId, level);
    assert.equal(typeof zhCN[labelId], "string");
    assert.equal(typeof enUS[labelId], "string");
    assert.notEqual(zhCN[labelId], level);
  }
  assert.equal(thoughtLevelLabelId("none"), thoughtLevelLabelId("disabled"));
  assert.equal(zhCN[thoughtLevelLabelId("ultra")!], "极致");
});

test("预设按固定顺序匹配，顺序变了就不再算同一个预设", () => {
  assert.equal(matchingReasoningPreset(["disabled", "enabled"]), "switch");
  assert.equal(matchingReasoningPreset(["low", "medium", "high"]), "three");
  assert.equal(matchingReasoningPreset(["low", "high", "max"]), "intensity");
  assert.equal(matchingReasoningPreset(["minimal", "low", "medium", "high", "xhigh"]), "full");
  assert.equal(matchingReasoningPreset(["high", "low", "max"]), undefined);
  assert.deepEqual(
    REASONING_LEVEL_PRESETS.map((preset) => preset.id),
    ["switch", "three", "intensity", "full"],
  );
});

test("没有可用映射时按 API 格式写入模板，已有映射则只改档位", () => {
  const filled = reasoningLevelChange({
    nextValues: ["low", "medium", "high"],
    mapValue: "",
    useRecommended: true,
    apiType: "openai-chat-completions",
  });
  assert.deepEqual(filled.reasoningLevelValuesValue, ["low", "medium", "high"]);
  assert.equal(
    filled.reasoningLevelMapValue,
    reasoningMapTemplate("openai-chat-completions").source,
  );

  const kept = reasoningLevelChange({
    nextValues: ["low", "high"],
    mapValue: "",
    inheritedMap: '{"reasoning_effort": reasoningLevel}',
    useRecommended: true,
    apiType: "openai-chat-completions",
  });
  assert.equal(kept.reasoningLevelMapValue, undefined);

  const manual = reasoningLevelChange({
    nextValues: ["disabled", "enabled"],
    mapValue: "  ",
    inheritedMap: '{"reasoning_effort": reasoningLevel}',
    useRecommended: false,
    apiType: "anthropic-messages",
  });
  assert.equal(manual.reasoningLevelMapValue, reasoningMapTemplate("anthropic-messages").source);
});

test("摘要能认出模板和常见简写，空映射说明即将写入的字段", () => {
  assert.deepEqual(
    reasoningMapSummary({
      personalMap: "",
      useRecommended: true,
      apiType: "openai-responses",
    }),
    {
      id: "settings.modelProvider.reasoningMapWillWriteAfterSelect",
      fields: ["reasoning.effort"],
    },
  );
  assert.equal(
    reasoningMapSummary({
      personalMap: "",
      inheritedMap: reasoningMapTemplate("anthropic-messages").source,
      useRecommended: true,
      apiType: "openai-chat-completions",
    }).id,
    "settings.modelProvider.reasoningMapWillWrite",
  );
  assert.deepEqual(
    reasoningMapSummary({
      personalMap: `{"reasoning_effort": reasoningLevel}`,
      useRecommended: false,
      apiType: "anthropic-messages",
    }).id,
    "settings.modelProvider.reasoningMapWillWrite",
  );
  assert.equal(
    reasoningMapSummary({
      personalMap: "{'custom': reasoningLevel}",
      useRecommended: true,
      apiType: "openai-chat-completions",
    }).id,
    "settings.modelProvider.reasoningMapCustom",
  );
  assert.equal(
    reasoningMapSummary({
      personalMap: "",
      inheritedMap: "{'vendor': true}",
      useRecommended: true,
      apiType: "openai-chat-completions",
    }).id,
    "settings.modelProvider.reasoningMapRecommended",
  );
  assert.equal(
    formatReasoningMapFields(["reasoning_effort", "thinking"], "zh-CN"),
    "reasoning_effort、thinking",
  );
  assert.equal(
    formatReasoningMapFields(["reasoning_effort", "thinking"], "en-US"),
    "reasoning_effort, thinking",
  );
});

test("模板与内置目录的默认 API 映射一致，并且能编译", () => {
  const builtin = JSON.parse(
    readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../../../config/provider/kcode-builtin.json"),
      "utf8",
    ),
  ) as unknown;
  const defaults = new Map<ReasoningMapApiType, string>();
  for (const rule of collectApiRules(builtin)) {
    if (rule.modelMatch !== ".*" || rule.baseUrlMatch || !rule.apiTypeMatch) continue;
    if (!API_TYPES.includes(rule.apiTypeMatch as ReasoningMapApiType)) continue;
    const map = rule.config?.optionSpecs?.reasoningLevel?.map;
    if (!map) continue;
    const apiType = rule.apiTypeMatch as ReasoningMapApiType;
    assert.equal(defaults.has(apiType), false, apiType);
    defaults.set(apiType, map);
  }
  assert.deepEqual([...defaults.keys()].sort(), [...API_TYPES].sort());
  for (const apiType of API_TYPES) {
    const template = reasoningMapTemplate(apiType);
    assert.equal(compact(template.source), compact(defaults.get(apiType) ?? ""));
    const program = compileModelOptionMap(template.source, "reasoningLevel");
    const disabled = program.evaluate("disabled");
    const low = program.evaluate("low");
    assert.equal(typeof disabled, "object");
    assert.equal(typeof low, "object");
    if (apiType === "openai-chat-completions") {
      assert.equal(low.reasoning_effort, "low");
      assert.equal(disabled.reasoning_effort, "none");
    }
    if (apiType === "openai-responses") {
      assert.equal(JSON.stringify(low.reasoning), JSON.stringify({ effort: "low" }));
    }
    if (apiType === "anthropic-messages") {
      assert.equal(JSON.stringify(disabled.thinking), JSON.stringify({ type: "disabled" }));
      assert.equal((low.output_config as { effort: string }).effort, "low");
    }
  }
});

function compact(source: string): string {
  return source.replace(/\s+/g, "");
}

function collectApiRules(value: unknown): Array<{
  modelMatch?: string;
  apiTypeMatch?: string;
  baseUrlMatch?: string;
  config?: { optionSpecs?: { reasoningLevel?: { map?: string } } };
}> {
  const rules: Array<{
    modelMatch?: string;
    apiTypeMatch?: string;
    baseUrlMatch?: string;
    config?: { optionSpecs?: { reasoningLevel?: { map?: string } } };
  }> = [];
  const visit = (node: unknown) => {
    if (Array.isArray(node)) {
      for (const item of node) visit(item);
      return;
    }
    if (!node || typeof node !== "object") return;
    const record = node as {
      modelMatch?: unknown;
      apiTypeMatch?: unknown;
      baseUrlMatch?: unknown;
      config?: { optionSpecs?: { reasoningLevel?: { map?: string } } };
    };
    if (typeof record.modelMatch === "string" && typeof record.apiTypeMatch === "string") {
      rules.push({
        modelMatch: record.modelMatch,
        apiTypeMatch: record.apiTypeMatch,
        ...(typeof record.baseUrlMatch === "string" ? { baseUrlMatch: record.baseUrlMatch } : {}),
        ...(record.config ? { config: record.config } : {}),
      });
    }
    for (const child of Object.values(record)) visit(child);
  };
  visit(value);
  return rules;
}
