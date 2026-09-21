import { AppUsagePanel } from "@/settings/usage-stats/AppUsagePanel.js";

export type UsageStatsSectionTab = "app";

export function UsageStatsSection({
  activeTab,
}: {
  activeTab: UsageStatsSectionTab;
  providerSourcesLoading?: boolean;
  workspaceIdentity?: string;
  workspacePath?: string;
}) {
  void activeTab;
  return <AppUsagePanel />;
}
