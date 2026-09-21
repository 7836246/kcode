import { createUuid } from "@kcode/shared";
import type { ProviderSettingsFormProvider } from "@/lib/providerSettingsFormTypes.js";
import { getProviderFormLabel } from "@/lib/providerSettingsFormTypes.js";

export function generateId(): string {
  return createUuid();
}

export function resolveModelProviderDisplayName(
  provider: Pick<ProviderSettingsFormProvider, "providerId" | "config">,
): string {
  return getProviderFormLabel(provider);
}

export type ModelProviderNavItem = {
  key: string;
  type: "custom";
  label: string;
  provider: ProviderSettingsFormProvider;
  statusActive: boolean;
};

export type ModelProviderNavGroupId = "custom";

export interface ModelProviderNavGroup {
  id: ModelProviderNavGroupId;
  title: string;
  items: ModelProviderNavItem[];
}
