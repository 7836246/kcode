import { create } from "zustand";
import type { DynamicWorkflowClientConfig } from "@kcode/shared";

export type DynamicWorkflowAvailabilityStatus = "loading" | "ready";

export interface DynamicWorkflowAvailabilitySnapshot {
  readonly status: DynamicWorkflowAvailabilityStatus;
  readonly enabled: boolean;
  readonly config: DynamicWorkflowClientConfig | null;
}

interface DynamicWorkflowAvailabilityState extends DynamicWorkflowAvailabilitySnapshot {
  markUnavailable(): void;
}

const INITIAL_SNAPSHOT: DynamicWorkflowAvailabilitySnapshot = {
  status: "loading",
  enabled: false,
  config: null,
};

export const useDynamicWorkflowAvailabilityStore = create<DynamicWorkflowAvailabilityState>(
  (set) => ({
    ...INITIAL_SNAPSHOT,
    markUnavailable() {
      set({ status: "ready", enabled: false, config: null });
    },
  }),
);
