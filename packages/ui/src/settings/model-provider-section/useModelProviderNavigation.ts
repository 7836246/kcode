/* eslint-disable max-lines -- Model Provider 导航需要集中计算分组、选中项与 Coding Plan 权益态，后续拆分时再收敛。 */
import { useEffect, useMemo } from "react";
import type { ProviderSettingsFormProvider } from "@/lib/providerSettingsFormTypes.js";
import { getProviderFormLabel } from "@/lib/providerSettingsFormTypes.js";
import type {
  ProviderFamilyConnectionSelection,
  ProviderFamilyConnectionSelectionSettings,
  ProviderFamilyDomain,
} from "@kcode/shared";
import {
  BUILTIN_MODEL_PROVIDER_IDS,
  isStartPlanModelProviderId,
  resolveModelProviderFamilySpecByProviderId,
} from "@kcode/shared";
import { useKCodeIntl } from "@/i18n/IntlProvider.js";
import {
  type CodingPlanEntitlementState,
  type ModelProviderNavGroup,
  type PresetProviderSpec,
} from "@/settings/model-provider-section/constants.js";
import {
  createCustomProviderNodeKey,
  createPresetProviderNodeKey,
} from "@/settings/model-provider-section/utils.js";
import {
  sortModelProvidersForDisplay,
  type ProviderOrderView,
} from "@/lib/modelProviderOrdering.js";
import type { EnterpriseCodingPlanProductDisplay } from "@/settings/model-provider-section/enterpriseCodingPlanProducts.js";
import { buildVisibleFamilyConnectionItems } from "@/settings/model-provider-section/providerFamilyConnectionVisibility.js";

interface PresetProviderWithConfig extends PresetProviderSpec {
  provider: ProviderSettingsFormProvider | null;
}

interface UseModelProviderNavigationOptions {
  presetProviders: PresetProviderWithConfig[];
  modelProviders: ProviderSettingsFormProvider[];
  /**
   * 当前账号明确有权益的 Provider。缺省等价于尚无账号权益；生产设置页始终显式传入。
   */
  entitledAccountProviderIds?: ReadonlySet<string>;
  modelProvidersLoading?: boolean;
  displayOrder?: ProviderOrderView;
  codingPlanEntitlements?: Partial<Record<string, CodingPlanEntitlementState>>;
  providerFamilyDomain?: ProviderFamilyDomain | null;
  connectionSelections?: ProviderFamilyConnectionSelectionSettings;
  pendingConnectionSelections?: ProviderFamilyConnectionSelectionSettings;
  familyConnectionSettingsLoading?: boolean;
  familyConnectionSettingsFailed?: boolean;
  subscribedTeamProducts?: EnterpriseCodingPlanProductDisplay[];
  showPurchasedTeamPlanFallback?: boolean;
  selectedNodeKey: string | null;
  setSelectedNodeKey: (key: string | null) => void;
  intl: ReturnType<typeof useKCodeIntl>["intl"];
}

export function useModelProviderNavigation({
  presetProviders: _presetProviders,
  modelProviders,
  entitledAccountProviderIds: _entitledAccountProviderIds = new Set(),
  modelProvidersLoading = false,
  displayOrder,
  codingPlanEntitlements = {},
  providerFamilyDomain: _providerFamilyDomain = null,
  connectionSelections = {},
  pendingConnectionSelections = {},
  familyConnectionSettingsLoading = false,
  familyConnectionSettingsFailed = false,
  subscribedTeamProducts = [],
  showPurchasedTeamPlanFallback = false,
  selectedNodeKey,
  setSelectedNodeKey,
  intl,
}: UseModelProviderNavigationOptions) {
  const customProviders = useMemo(() => {
    const allCustomProviders = modelProviders.filter(
      (provider) => provider.config.group === "standard-personal",
    );
    // 这里复用模型菜单的展示排序，确保设置页和聊天框供应商顺序一致。
    return sortModelProvidersForDisplay(allCustomProviders, displayOrder);
  }, [displayOrder, modelProviders]);

  // KCode 不再向用户提供官方智谱账号族与套餐入口。
  const codingPlanItems = useMemo<
    Extract<ModelProviderNavGroup["items"][number], { type: "codingPlan" }>[]
  >(() => [], []);
  const connectionModeCodingPlanItems = useMemo(
    () =>
      buildVisibleFamilyConnectionItems({
        items: codingPlanItems.filter((item) => !isStartPlanModelProviderId(item.presetId)),
        codingPlanEntitlements,
        subscribedTeamProducts,
        showPurchasedTeamPlanFallback,
        connectionSelections: {
          ...connectionSelections,
          ...pendingConnectionSelections,
        },
        teamPlanSelections: Object.fromEntries(
          Object.entries({ ...connectionSelections, ...pendingConnectionSelections }).filter(
            ([, selection]) => selection?.kind === "team-coding-plan",
          ),
        ),
      }),
    [
      codingPlanEntitlements,
      showPurchasedTeamPlanFallback,
      codingPlanItems,
      connectionSelections,
      pendingConnectionSelections,
      subscribedTeamProducts,
    ],
  );

  const navigationGroups = useMemo<ModelProviderNavGroup[]>(() => {
    const groups: ModelProviderNavGroup[] = [
      {
        id: "preset",
        title: intl.formatMessage({ id: "settings.modelProvider.presetTitle" }),
        items: [],
      },
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

    return groups;
  }, [customProviders, intl]);

  const navigationItems = useMemo(() => {
    const visibleItems = navigationGroups.flatMap((group) => group.items);
    const visibleKeys = new Set(visibleItems.map((item) => item.key));
    return [
      ...visibleItems,
      ...connectionModeCodingPlanItems.filter((item) => !visibleKeys.has(item.key)),
    ];
  }, [connectionModeCodingPlanItems, navigationGroups]);

  const selectableNavigationItems = useMemo(
    () => navigationItems.filter((item) => item.type !== "codingPlanLoading"),
    [navigationItems],
  );
  const selectableSideNavigationItems = useMemo(
    () =>
      navigationGroups
        .flatMap((group) => group.items)
        .filter((item) => item.type !== "codingPlanLoading"),
    [navigationGroups],
  );

  const navigationItemByKey = useMemo(
    () => new Map(selectableNavigationItems.map((item) => [item.key, item])),
    [selectableNavigationItems],
  );
  const sideNavigationItemByKey = useMemo(
    () => new Map(selectableSideNavigationItems.map((item) => [item.key, item])),
    [selectableSideNavigationItems],
  );

  const selectedNavItem = selectedNodeKey
    ? resolveSelectedProviderFamilyConnectionItem({
        selectedNodeKey,
        navigationItemByKey,
        selectableNavigationItems,
        connectionSelections,
        pendingConnectionSelections,
        familyConnectionSettingsLoading,
        familyConnectionSettingsFailed,
        modelProvidersLoading,
      })
    : null;

  const requestedItem = selectedNodeKey ? navigationItemByKey.get(selectedNodeKey) : undefined;
  const requestedFamily =
    requestedItem?.type === "preset"
      ? resolveModelProviderFamilySpecByProviderId(requestedItem.presetId)
      : null;
  const requestedSelection = requestedFamily ? connectionSelections[requestedFamily.id] : undefined;
  const navigationUnavailable =
    !modelProvidersLoading &&
    !familyConnectionSettingsLoading &&
    (familyConnectionSettingsFailed ||
      Boolean(
        requestedFamily &&
        requestedSelection &&
        requestedSelection.kind !== "start-plan" &&
        !selectableNavigationItems.some((item) =>
          connectionSelectionMatchesNavigationItem(requestedFamily.id, requestedSelection, item),
        ),
      ));

  const fallbackNodeKey = resolveFallbackModelProviderNodeKey({
    selectedNodeKey,
    selectableNavigationItems,
  });
  useEffect(() => {
    const hasSelectedNode = selectedNodeKey ? sideNavigationItemByKey.has(selectedNodeKey) : false;
    if (hasSelectedNode) {
      return;
    }

    if (selectedNodeKey !== fallbackNodeKey) {
      setSelectedNodeKey(fallbackNodeKey);
    }
  }, [
    fallbackNodeKey,
    selectedNavItem,
    selectedNodeKey,
    setSelectedNodeKey,
    sideNavigationItemByKey,
  ]);

  return {
    navigationGroups,
    navigationItems,
    selectedNavItem,
    navigationUnavailable,
  };
}

function resolveFallbackModelProviderNodeKey({
  selectedNodeKey,
  selectableNavigationItems,
}: {
  selectedNodeKey: string | null;
  selectableNavigationItems: Array<
    Exclude<ModelProviderNavGroup["items"][number], { type: "codingPlanLoading" }>
  >;
}): string | null {
  const initialConnectionItem = pickInitialConnectionNavigationItem(selectableNavigationItems);
  const initialSideNodeKey = initialConnectionItem
    ? resolveSideNavigationNodeKeyForConnectionItem(initialConnectionItem)
    : null;
  if (isFamilyPresetNodeKey(selectedNodeKey) && initialSideNodeKey) {
    // App OAuth 登录成功后会按 active provider 隐藏另一组预置入口。
    // 当前选中项消失时使用初始化优先级回落到对应 family，而不是把连接方式塞回侧栏。
    return initialSideNodeKey;
  }

  // 初始化只在没有有效选中项时发生；如果当前用户选择仍有效，上层 effect 不会调用 fallback 抢焦点。
  return (
    initialSideNodeKey ??
    resolveSideNavigationNodeKeyForConnectionItem(selectableNavigationItems[0] ?? null)
  );
}

function resolveSelectedProviderFamilyConnectionItem({
  selectedNodeKey,
  navigationItemByKey,
  selectableNavigationItems,
  connectionSelections,
  pendingConnectionSelections,
  familyConnectionSettingsLoading,
  familyConnectionSettingsFailed,
  modelProvidersLoading,
}: {
  selectedNodeKey: string;
  navigationItemByKey: Map<
    string,
    Exclude<ModelProviderNavGroup["items"][number], { type: "codingPlanLoading" }>
  >;
  selectableNavigationItems: Array<
    Exclude<ModelProviderNavGroup["items"][number], { type: "codingPlanLoading" }>
  >;
  connectionSelections: ProviderFamilyConnectionSelectionSettings;
  pendingConnectionSelections: ProviderFamilyConnectionSelectionSettings;
  familyConnectionSettingsLoading?: boolean;
  familyConnectionSettingsFailed?: boolean;
  modelProvidersLoading?: boolean;
}): Exclude<ModelProviderNavGroup["items"][number], { type: "codingPlanLoading" }> | null {
  const selectedItem = navigationItemByKey.get(selectedNodeKey) ?? null;
  if (!selectedItem) {
    return null;
  }
  if (selectedItem.type !== "preset") {
    return selectedItem;
  }
  const familySpec = resolveModelProviderFamilySpecByProviderId(selectedItem.presetId);
  if (!familySpec) {
    return selectedItem;
  }
  if (familyConnectionSettingsLoading) {
    // 从外部入口打开 Model Settings 时，settings 首次 hydrate 前不能按默认 oauth
    // 连接方式推导 Start Plan，否则右侧连接方式会先闪成 Start 再按已保存设置纠偏。
    return null;
  }
  const mergedSelections = { ...connectionSelections, ...pendingConnectionSelections };
  const resolvedItem =
    !familyConnectionSettingsFailed &&
    pickFamilyModeNavigationItem(selectableNavigationItems, familySpec.id, mergedSelections);
  if (resolvedItem) {
    return resolvedItem;
  }
  if (modelProvidersLoading) return null;
  // 非法/过期连接只影响当前设置页的落点，不能让 null 被详情页当作永久 loading。
  // 不写回 Family 偏好，不改会话 Selection；用户可在这个同 Family 页面重新选择。
  return pickInitialConnectionNavigationItem(
    selectableNavigationItems.filter(
      (item) =>
        "presetId" in item &&
        resolveModelProviderFamilySpecByProviderId(item.presetId)?.id === familySpec.id,
    ),
  );
}

function resolveSideNavigationNodeKeyForConnectionItem(
  item: Exclude<ModelProviderNavGroup["items"][number], { type: "codingPlanLoading" }> | null,
): string | null {
  if (!item) {
    return null;
  }
  if (item.type !== "preset" && item.type !== "codingPlan" && item.type !== "teamPlan") {
    return item.key;
  }
  if (item.type === "codingPlan" && isStartPlanModelProviderId(item.presetId)) return item.key;
  const familySpec = resolveModelProviderFamilySpecByProviderId(item.presetId);
  if (!familySpec) {
    return item.key;
  }
  return createPresetProviderNodeKey(familySpec.startPlanProviderId);
}

function pickInitialConnectionNavigationItem(
  selectableNavigationItems: Array<
    Exclude<ModelProviderNavGroup["items"][number], { type: "codingPlanLoading" }>
  >,
): Exclude<ModelProviderNavGroup["items"][number], { type: "codingPlanLoading" }> | null {
  const planItems = selectableNavigationItems.filter(isPlanConnectionNavigationItem);
  const personalCodingPlanItem = planItems.find(
    (item) =>
      item.type === "codingPlan" &&
      !isStartPlanModelProviderId(item.presetId) &&
      item.status === "purchased",
  );
  if (personalCodingPlanItem) {
    return personalCodingPlanItem;
  }
  const teamPlanItem = planItems.find((item) => item.type === "teamPlan");
  if (teamPlanItem) {
    return teamPlanItem;
  }
  const personalCodingPlanFallback = planItems.find(
    (item) => item.type === "codingPlan" && !isStartPlanModelProviderId(item.presetId),
  );
  if (personalCodingPlanFallback) {
    return personalCodingPlanFallback;
  }
  if (planItems[0]) {
    return planItems[0];
  }
  return selectableNavigationItems.find((item) => item.type === "preset") ?? null;
}

function pickFamilyModeNavigationItem(
  selectableNavigationItems: Array<
    Exclude<ModelProviderNavGroup["items"][number], { type: "codingPlanLoading" }>
  >,
  familyId: "zai" | "bigmodel",
  connectionSelections: ProviderFamilyConnectionSelectionSettings,
): Exclude<ModelProviderNavGroup["items"][number], { type: "codingPlanLoading" }> | null {
  const selection = connectionSelections[familyId];
  if (!selection) return null;
  return (
    selectableNavigationItems.find((item) =>
      connectionSelectionMatchesNavigationItem(familyId, selection, item),
    ) ?? null
  );
}

export function connectionSelectionMatchesNavigationItem(
  family: ProviderFamilyDomain,
  selection: ProviderFamilyConnectionSelection,
  item: Exclude<ModelProviderNavGroup["items"][number], { type: "codingPlanLoading" }>,
): boolean {
  if (item.type === "custom") return false;
  const familySpec = resolveModelProviderFamilySpecByProviderId(item.presetId ?? "");
  if (familySpec?.id !== family) return false;
  if (selection.kind === "start-plan") {
    return false;
  }
  if (selection.kind === "individual-coding-plan") {
    return (
      item.type === "codingPlan" && item.presetId === familySpec.individualCodingPlanProviderId
    );
  }
  return (
    item.type === "teamPlan" &&
    item.presetId === familySpec.teamCodingPlanProviderId &&
    // 团队连接按平台、组织和项目定位；订阅商品会在权益快照和 pricing 校正间变化。
    // 不能把同项目的商品更新误判为连接丢失，否则初始化会出现空选项和错误提示。
    item.organizationId === selection.organizationId &&
    item.projectId === selection.projectId
  );
}

function isPlanConnectionNavigationItem(
  item: Exclude<ModelProviderNavGroup["items"][number], { type: "codingPlanLoading" }>,
): item is Extract<ModelProviderNavGroup["items"][number], { type: "codingPlan" | "teamPlan" }> {
  return (
    (item.type === "codingPlan" && !isStartPlanModelProviderId(item.presetId)) ||
    item.type === "teamPlan"
  );
}

function isFamilyPresetNodeKey(nodeKey: string | null): boolean {
  return (
    nodeKey?.startsWith("coding-plan:") === true ||
    nodeKey?.startsWith("team:") === true ||
    nodeKey === `preset:${BUILTIN_MODEL_PROVIDER_IDS.zaiStartPlan}` ||
    nodeKey === `preset:${BUILTIN_MODEL_PROVIDER_IDS.bigmodelStartPlan}`
  );
}
