import { useEffect, useState } from "react";
import { ExternalLink, KeyRound, LoaderCircle } from "lucide-react";
import type { BotConfig } from "@kcode/shared";
import { Button } from "@/components/ui/button.js";
import { Input } from "@/components/ui/input.js";
import { useKCodeIntl } from "@/i18n/IntlProvider.js";

const DINGTALK_OPEN_PLATFORM_URL = "https://open-dev.dingtalk.com";

export function DingdingSettingsFields({
  bot,
  credentialValue,
  secretSaving,
  onCredentialValueChange,
  onSave,
}: {
  bot: BotConfig;
  credentialValue: string;
  secretSaving: boolean;
  onCredentialValueChange: (value: string) => void;
  onSave: (input: { dingdingAppKey: string; credentialValue: string }) => void;
}) {
  const { intl } = useKCodeIntl();
  const [appKey, setAppKey] = useState(bot.dingdingAppKey ?? "");

  useEffect(() => {
    setAppKey(bot.dingdingAppKey ?? "");
  }, [bot.dingdingAppKey, bot.id]);

  const canSave = appKey.trim() && credentialValue.trim();

  return (
    <div className="space-y-3">
      <p className="text-ui-base text-foreground-subtle">
        {intl.formatMessage({ id: "bots.dingding.setupHint" })}
      </p>
      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={() => {
          void globalThis.open(DINGTALK_OPEN_PLATFORM_URL, "_blank", "noopener,noreferrer");
        }}
      >
        <ExternalLink className="size-4" />
        {intl.formatMessage({ id: "bots.openDingdingPortal" })}
      </Button>
      <Input
        size="lg"
        value={appKey}
        onChange={(event) => setAppKey(event.target.value)}
        placeholder={intl.formatMessage({ id: "bots.dingdingAppKeyPlaceholder" })}
        disabled={secretSaving}
      />
      <Input
        size="lg"
        type="password"
        value={credentialValue}
        onChange={(event) => onCredentialValueChange(event.target.value)}
        placeholder={intl.formatMessage({ id: "bots.dingdingAppSecretPlaceholder" })}
        disabled={secretSaving}
      />
      <div className="flex justify-end">
        <Button
          type="button"
          size="lg"
          disabled={secretSaving || !canSave}
          onClick={() =>
            onSave({
              dingdingAppKey: appKey.trim(),
              credentialValue: credentialValue.trim(),
            })
          }
        >
          {secretSaving ? <LoaderCircle className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
          {intl.formatMessage({ id: "bots.saveSecrets" })}
        </Button>
      </div>
    </div>
  );
}
