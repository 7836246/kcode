import { useEffect, useMemo } from "react";
import type { ProviderSettingsFormProvider } from "@/lib/providerSettingsFormTypes.js";
import { getProviderFormLabel } from "@/lib/providerSettingsFormTypes.js";
import { useKCodeIntl } from "@/i18n/IntlProvider.js";
import type { ModelProviderNavGroup, ModelProviderNavItem } from "@/settings/model-provider-section/constants.js";
import { createCustomProviderNodeKey } from "@/settings/model-provider-section/utils.js";
import {
  sortModelProvidersForDisplay,
  type ProviderOrderView,
} from "@/lib/modelProviderOrdering.js";

interface UseModelProviderNavigationOptions {
  modelProviders: ProviderSettingsFormProvider[];
  modelProvidersLoading?: boolean;
  displayOrder?: ProviderOrderView;
  selectedNodeKey: string | null;
  setSelectedNodeKey: (key: string | null) => void;
  intl: ReturnType<typeof useKCodeIntl>["intl"];
}

export function useModelProviderNavigation({
  modelProviders,
  modelProvidersLoading = false,
  displayOrder,
  selectedNodeKey,
  setSelectedNodeKey,
  intl,
}: UseModelProviderNavigationOptions) {
  const customProviders = useMemo(() => {
    const allCustomProviders = modelProviders.filter(
      (provider) => provider.config.group === "standard-personal",
    );
    return sortModelProvidersForDisplay(allCustomProviders, displayOrder);
  }, [displayOrder, modelProviders]);

  const navigationGroups = useMemo<ModelProviderNavGroup[]>(() => {
    return [
      {
        id: "custom",
        title: intl.formatMessage({ id: "settings.modelProvider.customTitle" }),
        items: customProviders.map((provider) => ({
          key: createCustomProviderNodeKey(provider.providerId),
          type: "custom" as const,
          label: getProviderFormLabel(provider),
          provider,
          statusActive: provider.executable === true,
        })),
      },
    ];
  }, [customProviders, intl]);

  const navigationItems = useMemo(
    () => navigationGroups.flatMap((group) => group.items),
    [navigationGroups],
  );
  const navigationItemByKey = useMemo(
    () => new Map(navigationItems.map((item) => [item.key, item])),
    [navigationItems],
  );

  const selectedNavItem = selectedNodeKey
    ? (navigationItemByKey.get(selectedNodeKey) ?? null)
    : null;
  const fallbackNodeKey = resolveFallbackCustomProviderNodeKey({
    selectedNodeKey,
    navigationItems,
  });

  useEffect(() => {
    const hasSelectedNode = selectedNodeKey ? navigationItemByKey.has(selectedNodeKey) : false;
    if (hasSelectedNode) {
      return;
    }
    if (selectedNodeKey !== fallbackNodeKey) {
      setSelectedNodeKey(fallbackNodeKey);
    }
  }, [fallbackNodeKey, navigationItemByKey, selectedNodeKey, setSelectedNodeKey]);

  return {
    navigationGroups,
    navigationItems,
    selectedNavItem,
    navigationUnavailable: Boolean(
      selectedNodeKey && !modelProvidersLoading && !navigationItemByKey.has(selectedNodeKey),
    ),
  };
}

function resolveFallbackCustomProviderNodeKey({
  selectedNodeKey,
  navigationItems,
}: {
  selectedNodeKey: string | null;
  navigationItems: ModelProviderNavItem[];
}): string | null {
  if (selectedNodeKey && navigationItems.some((item) => item.key === selectedNodeKey)) {
    return selectedNodeKey;
  }
  return navigationItems[0]?.key ?? null;
}
