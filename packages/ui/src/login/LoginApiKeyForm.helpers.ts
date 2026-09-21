import type { AppSettings } from "@kcode/shared";
import { isApiKeyAccess } from "@kcode/provider";
import type { ModelSelectionView, ProviderSettingsView } from "@kcode/services";
import { encodeCustomModelValue } from "@/lib/kcodeCustomModelValue.js";

export type LoginApiKeyTemplate = ProviderSettingsView["providerTemplates"][number];

export function listLoginApiKeyTemplates(
  templates: readonly LoginApiKeyTemplate[] | null | undefined,
): LoginApiKeyTemplate[] {
  return (templates ?? []).filter((template) => isApiKeyAccess(template.config.access));
}

export function resolveLoginApiKeyDefaultTemplateId(
  templates: readonly LoginApiKeyTemplate[],
): string | null {
  return templates[0]?.templateId ?? null;
}

export function buildLoginApiKeySkipSettings(now: number): Pick<
  AppSettings,
  "providerFamilyDomainUpdatedAt" | "providerFamilyDomainMigrated"
> {
  return {
    providerFamilyDomainUpdatedAt: now,
    providerFamilyDomainMigrated: true,
  };
}

export function shouldShowLoginApiKeyLink(
  apiKeyValue: string,
  apiKeyUrl: string | undefined,
): boolean {
  return Boolean(apiKeyUrl) && apiKeyValue.trim().length === 0;
}

export function buildLoginApiKeyDefaultModelPreferenceFromSelection(
  view: ModelSelectionView,
  providerId: string,
): string | null {
  const firstModel = view.providers.find((provider) => provider.providerId === providerId)
    ?.models[0]?.modelId;
  return firstModel ? encodeCustomModelValue(providerId, firstModel) : null;
}
