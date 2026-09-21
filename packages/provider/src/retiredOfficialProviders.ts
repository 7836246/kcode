import {
  ProviderConfigMap,
  ProviderTemplateMap,
  type ProviderConfigRule,
} from "./config/index.js";

/** 已下线的官方智谱 / Z.ai / BigModel 模板；磁盘残留仍可能带这些 ID。 */
const RETIRED_OFFICIAL_TEMPLATE_IDS = new Set([
  "zai-api",
  "bigmodel-api",
  "zai-standard-api",
  "bigmodel-standard-api",
]);

export function isRetiredOfficialProviderId(providerId: string): boolean {
  return (
    RETIRED_OFFICIAL_TEMPLATE_IDS.has(providerId) ||
    providerId.startsWith("account:zai-") ||
    providerId.startsWith("account:bigmodel-")
  );
}

export function isRetiredOfficialTemplateId(templateId: string | null | undefined): boolean {
  return Boolean(templateId && RETIRED_OFFICIAL_TEMPLATE_IDS.has(templateId));
}

/** 残留官方账号 / 模板不得进入可用 Registry。解析失败不能让旧文件整份炸掉。 */
export function isRetiredOfficialProvider(rule: {
  readonly providerId: string;
  readonly templateId?: string | null;
  readonly config?: { readonly access?: { readonly type?: string } | null };
}): boolean {
  if (rule.config?.access?.type === "zhipu-account") return true;
  if (isRetiredOfficialTemplateId(rule.templateId)) return true;
  return isRetiredOfficialProviderId(rule.providerId);
}

export function omitRetiredOfficialProviders(providers: ProviderConfigMap): ProviderConfigMap {
  return new ProviderConfigMap(
    providers.rules().filter((rule: ProviderConfigRule) => !isRetiredOfficialProvider(rule)),
  );
}

export function omitRetiredOfficialTemplates(templates: ProviderTemplateMap): ProviderTemplateMap {
  return new ProviderTemplateMap(
    templates.entries().filter(([templateId]) => !isRetiredOfficialTemplateId(templateId)),
  );
}
