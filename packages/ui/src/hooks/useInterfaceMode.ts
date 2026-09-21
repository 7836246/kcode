import { useKCodeStoreWithDefault } from "@/store/StoreProvider.js";

export function useIsOfficeMode(): boolean {
  return useKCodeStoreWithDefault((state) => state.interfaceMode === "office", false);
}
