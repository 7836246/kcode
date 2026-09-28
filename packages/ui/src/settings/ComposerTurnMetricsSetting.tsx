import { useState } from "react";
import { TID_SETTINGS_COMPOSER_TURN_METRICS_SWITCH } from "@kcode/shared";
import { Switch } from "@/components/ui/switch.js";
import { toast } from "@/components/ui/toast.js";
import { useSettings } from "@/hooks/useSettingService.js";
import { useKCodeIntl } from "@/i18n/IntlProvider.js";
import { logger } from "@/logger.js";
import { SettingsRow } from "@/settings/SettingsPageParts.js";
import { isComposerTurnMetricsVisible } from "@/chat-input-toolbar/turnMetrics.js";

export function ComposerTurnMetricsSetting() {
  const { intl } = useKCodeIntl();
  const { settings, update } = useSettings();
  const [saving, setSaving] = useState(false);
  const setVisible = async (visible: boolean) => {
    setSaving(true);
    try {
      await update({ composerTurnMetricsVisible: visible });
    } catch (error) {
      logger.warn("[settings] 更新生成指标展示失败", { error: String(error) });
      toast(intl.formatMessage({ id: "settings.composerTurnMetricsVisible.saveError" }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsRow
      label={intl.formatMessage({ id: "settings.composerTurnMetricsVisible" })}
      description={intl.formatMessage({
        id: "settings.composerTurnMetricsVisibleDescription",
      })}
      control={
        <Switch
          checked={isComposerTurnMetricsVisible(settings)}
          disabled={saving || !settings}
          data-testid={TID_SETTINGS_COMPOSER_TURN_METRICS_SWITCH}
          aria-label={intl.formatMessage({ id: "settings.composerTurnMetricsVisible" })}
          onCheckedChange={setVisible}
        />
      }
    />
  );
}
