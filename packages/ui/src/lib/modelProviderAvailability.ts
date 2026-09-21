import type { ModelSelectionView } from "@kcode/services";
import { isLeftoverOfficialAccountProvider } from "@/lib/leftoverOfficialAccountProvider.js";

interface ProviderAvailabilityState {
  readonly source: "registry";
  readonly hydrated: boolean;
  readonly providerCount: number;
  readonly hasUsableProvider: boolean;
}

export function resolveProviderAvailabilityState(params: {
  modelSelectionView: ModelSelectionView | null;
}): ProviderAvailabilityState {
  const providers = (params.modelSelectionView?.providers ?? []).filter(
    (provider) =>
      !isLeftoverOfficialAccountProvider({
        providerId: provider.providerId,
        accessType: provider.config.access?.type,
      }),
  );
  return {
    source: "registry",
    hydrated: params.modelSelectionView !== null,
    providerCount: providers.length,
    hasUsableProvider:
      params.modelSelectionView !== null &&
      providers.some((provider) => provider.models.length > 0),
  };
}
