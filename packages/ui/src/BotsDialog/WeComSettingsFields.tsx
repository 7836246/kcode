import { useEffect, useState } from "react";
import { Copy, KeyRound, LoaderCircle } from "lucide-react";
import type { BotConfig } from "@kcode/shared";
import { Button } from "@/components/ui/button.js";
import { Input } from "@/components/ui/input.js";
import { toast } from "@/components/ui/toast.js";
import { useKCodeIntl } from "@/i18n/IntlProvider.js";
import { useSettings } from "@/hooks/useSettingService.js";

export function WeComSettingsFields({
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
  onSave: (input: {
    wecomCorpId: string;
    wecomAgentId: string;
    wecomCallbackToken: string;
    credentialValue: string;
    webhookSecretValue: string;
  }) => void;
}) {
  const { intl } = useKCodeIntl();
  const { settings } = useSettings();
  const [corpId, setCorpId] = useState(bot.wecomCorpId ?? "");
  const [agentId, setAgentId] = useState(bot.wecomAgentId ?? "");
  const [callbackToken, setCallbackToken] = useState(bot.wecomCallbackToken ?? "");
  const [encodingAesKey, setEncodingAesKey] = useState("");
  const callbackOrigin = settings?.kcodeEndpointOrigin?.trim() || globalThis.location?.origin || "";
  const callbackUrl = `${callbackOrigin.replace(/\/+$/u, "")}/api/bots/wecom/${bot.id}`;

  useEffect(() => {
    setCorpId(bot.wecomCorpId ?? "");
    setAgentId(bot.wecomAgentId ?? "");
    setCallbackToken(bot.wecomCallbackToken ?? "");
  }, [bot.id, bot.wecomAgentId, bot.wecomCallbackToken, bot.wecomCorpId]);

  const canSave =
    corpId.trim() &&
    agentId.trim() &&
    callbackToken.trim() &&
    credentialValue.trim() &&
    encodingAesKey.trim();

  return (
    <div className="space-y-3">
      <p className="text-ui-base text-foreground-subtle">
        {intl.formatMessage({ id: "bots.wecom.setupHint" })}
      </p>
      <Input
        size="lg"
        value={corpId}
        onChange={(event) => setCorpId(event.target.value)}
        placeholder={intl.formatMessage({ id: "bots.wecomCorpIdPlaceholder" })}
        disabled={secretSaving}
      />
      <Input
        size="lg"
        value={agentId}
        onChange={(event) => setAgentId(event.target.value)}
        placeholder={intl.formatMessage({ id: "bots.wecomAgentIdPlaceholder" })}
        disabled={secretSaving}
      />
      <Input
        size="lg"
        type="password"
        value={credentialValue}
        onChange={(event) => onCredentialValueChange(event.target.value)}
        placeholder={intl.formatMessage({ id: "bots.wecomSecretPlaceholder" })}
        disabled={secretSaving}
      />
      <Input
        size="lg"
        value={callbackToken}
        onChange={(event) => setCallbackToken(event.target.value)}
        placeholder={intl.formatMessage({ id: "bots.wecomTokenPlaceholder" })}
        disabled={secretSaving}
      />
      <Input
        size="lg"
        type="password"
        value={encodingAesKey}
        onChange={(event) => setEncodingAesKey(event.target.value)}
        placeholder={intl.formatMessage({ id: "bots.wecomEncodingAesKeyPlaceholder" })}
        disabled={secretSaving}
      />
      <div className="flex items-center gap-2">
        <Input size="lg" readOnly value={callbackUrl} className="min-w-0 flex-1 font-mono" />
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => {
            void navigator.clipboard.writeText(callbackUrl).then(() => {
              toast(intl.formatMessage({ id: "bots.wecomCallbackCopied" }));
            });
          }}
        >
          <Copy className="size-4" />
        </Button>
      </div>
      <div className="flex justify-end">
        <Button
          type="button"
          size="lg"
          disabled={secretSaving || !canSave}
          onClick={() =>
            onSave({
              wecomCorpId: corpId.trim(),
              wecomAgentId: agentId.trim(),
              wecomCallbackToken: callbackToken.trim(),
              credentialValue: credentialValue.trim(),
              webhookSecretValue: encodingAesKey.trim(),
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
