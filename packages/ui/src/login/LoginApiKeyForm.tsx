import { useMemo, useState } from "react";
import { isApiKeyAccess, resolveProviderTemplateName } from "@kcode/provider";
import { Loader2Icon, TriangleAlertIcon } from "lucide-react";
import {
  TID_LOGIN_API_KEY_CONTINUE_BUTTON,
  TID_LOGIN_API_KEY_ERROR,
  TID_LOGIN_API_KEY_INPUT,
  TID_LOGIN_API_KEY_PROVIDER_ITEM,
  TID_LOGIN_API_KEY_PROVIDER_TRIGGER,
  TID_LOGIN_API_KEY_SKIP_BUTTON,
  testId,
} from "@kcode/shared";
import { Alert, AlertDescription } from "@/components/ui/alert.js";
import { Button } from "@/components/ui/button.js";
import { Input } from "@/components/ui/input.js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.js";
import { usePlatform } from "@/hooks/usePlatform.js";
import { useProviderSettingsView } from "@/hooks/useProviderSettingsView.js";
import { useServices } from "@/hooks/useServices.js";
import { useKCodeIntl } from "@/i18n/IntlProvider.js";
import { logger } from "@/logger.js";
import { ProviderLogo } from "@/settings/model-provider-section/ProviderLogo.js";
import {
  buildLoginApiKeyDefaultModelPreferenceFromSelection,
  buildLoginApiKeySkipSettings,
  listLoginApiKeyTemplates,
  resolveLoginApiKeyDefaultTemplateId,
  resolveLoginApiKeyProbeModelId,
  shouldShowLoginApiKeyLink,
} from "@/login/LoginApiKeyForm.helpers.js";
import { connectLoginApiKeyProvider } from "@/login/loginApiKeyContinue.js";
import { useKCodeStore } from "@/store/StoreProvider.js";

interface LoginApiKeyFormProps {
  onSaved: () => void | Promise<void>;
  onSkipped: () => void | Promise<void>;
}

export function LoginApiKeyForm({ onSaved, onSkipped }: LoginApiKeyFormProps) {
  const { intl, locale } = useKCodeIntl();
  const platform = usePlatform();
  const { fileService, modelSelectionService, providerSettingsService, settingService } =
    useServices();
  const markApiKeyLoginSuccess = useKCodeStore((state) => state.markApiKeyLoginSuccess);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [apiKeyValue, setApiKeyValue] = useState("");
  const [pendingProviderId, setPendingProviderId] = useState<string | null>(null);
  const [phase, setPhase] = useState<"save" | "probe" | null>(null);
  const [skipping, setSkipping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const providerSettingsRead = useProviderSettingsView();
  const providerSettingsView =
    providerSettingsRead.state.status === "ready" ? providerSettingsRead.state.view : null;
  const templates = useMemo(
    () => listLoginApiKeyTemplates(providerSettingsView?.providerTemplates),
    [providerSettingsView?.providerTemplates],
  );
  const selectedTemplateId = templates.some((template) => template.templateId === templateId)
    ? templateId
    : resolveLoginApiKeyDefaultTemplateId(templates);
  const selectedTemplate = templates.find((template) => template.templateId === selectedTemplateId);
  const providerLabel = selectedTemplate
    ? resolveProviderTemplateName(selectedTemplate.templateId, selectedTemplate, locale)
    : intl.formatMessage({ id: "login.apiKey.providerLabel" });
  const templateAccess = selectedTemplate?.config.access;
  const apiKeyUrl = isApiKeyAccess(templateAccess) ? templateAccess.apiKeyManagementUrl : undefined;
  // 用户已经输入或回填 API Key 后，右侧获取入口会挤占密码输入区域。
  const showApiKeyLink = shouldShowLoginApiKeyLink(apiKeyValue, apiKeyUrl ?? undefined);

  const saveApiKeyProvider = async () => {
    setPhase("save");
    setError(null);
    try {
      const result = await connectLoginApiKeyProvider(
        {
          apiKey: apiKeyValue,
          templateId: selectedTemplateId,
          previousProviderId: pendingProviderId,
        },
        {
          listTemplates: async () => (await providerSettingsService.getView()).providerTemplates,
          createPersonalProvider: (input) => providerSettingsService.createPersonalProvider(input),
          deletePersonalProvider: (providerId) =>
            providerSettingsService.deletePersonalProvider(providerId),
          readModelId: async (providerId) =>
            resolveLoginApiKeyProbeModelId(await modelSelectionService.getView(), providerId),
          ensureConversationWorkspace: () => fileService.ensureConversationWorkspace(),
          testModelConnectivity: async (input) => {
            setPhase("probe");
            return providerSettingsService.testModelConnectivity(input);
          },
        },
      );
      if (result.status === "invalid") {
        setError(
          intl.formatMessage(
            {
              id:
                result.reason === "empty-key"
                  ? "login.apiKey.emptyError"
                  : "login.apiKey.providerMissingError",
            },
            { provider: providerLabel },
          ),
        );
        return;
      }
      setPendingProviderId(result.providerId);
      if (result.status === "failed") {
        logger.warn("[LoginEntry] API Key 连通性探测未通过", {
          templateId: selectedTemplateId,
          kind: result.kind,
        });
        const probeErrorId = {
          auth: "login.apiKey.error.auth",
          endpoint: "login.apiKey.error.endpoint",
          model: "login.apiKey.error.model",
        } as const;
        setError(
          result.kind === "other"
            ? intl.formatMessage(
                { id: "login.apiKey.error.other" },
                {
                  reason: result.detail || intl.formatMessage({ id: "login.apiKey.error.unknown" }),
                },
              )
            : intl.formatMessage({ id: probeErrorId[result.kind] }),
        );
        return;
      }
      const defaultModelPreference = buildLoginApiKeyDefaultModelPreferenceFromSelection(
        await modelSelectionService.getView(),
        result.providerId,
      );
      markApiKeyLoginSuccess(defaultModelPreference);
      await onSaved();
    } catch (saveError) {
      logger.error("[LoginEntry] 保存 API Key provider 失败", {
        templateId: selectedTemplateId,
        error: saveError,
      });
      setError(
        intl.formatMessage(
          { id: "login.apiKey.saveError" },
          {
            error: saveError instanceof Error ? saveError.message : String(saveError),
          },
        ),
      );
    } finally {
      setPhase(null);
    }
  };

  const skipApiKeyProvider = async () => {
    setSkipping(true);
    setError(null);
    try {
      // 跳过只表示用户确认先不配供应商，不能写入空 API Key
      // 或触发 API Key 登录成功事件，否则后续模型选择会误以为已有可用凭据。
      await settingService.update(buildLoginApiKeySkipSettings(Date.now()));
      await onSkipped();
    } catch (skipError) {
      logger.error("[LoginEntry] 跳过 API Key 登录失败", {
        templateId: selectedTemplateId,
        error: skipError,
      });
      setError(
        intl.formatMessage(
          { id: "login.apiKey.skipError" },
          {
            error: skipError instanceof Error ? skipError.message : String(skipError),
          },
        ),
      );
    } finally {
      setSkipping(false);
    }
  };

  const busy = phase !== null || skipping;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-ui-base font-medium text-foreground">
          {intl.formatMessage({ id: "login.apiKey.title" })}
        </h2>
        <div className="space-y-2">
          <div>
            <Select
              value={selectedTemplateId ?? undefined}
              onValueChange={(value) => setTemplateId(value)}
              disabled={busy || templates.length === 0}
            >
              <SelectTrigger
                id="login-api-key-provider"
                size="lg"
                className="h-10 w-full text-ui-base"
                data-testid={TID_LOGIN_API_KEY_PROVIDER_TRIGGER}
                aria-label={intl.formatMessage({
                  id: "login.apiKey.providerLabel",
                })}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end" className="rounded-lg">
                {templates.map((template) => (
                  <SelectItem
                    key={template.templateId}
                    value={template.templateId}
                    className="rounded-md"
                    data-testid={testId(TID_LOGIN_API_KEY_PROVIDER_ITEM, template.templateId)}
                  >
                    <ProviderLogo logo={template.config.logo} className="size-4" />
                    {resolveProviderTemplateName(template.templateId, template, locale)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="relative">
            <Input
              id="login-api-key"
              type="password"
              size="lg"
              className={`h-10 w-full text-ui-base ${showApiKeyLink ? "pr-28" : ""}`}
              data-testid={TID_LOGIN_API_KEY_INPUT}
              aria-label={intl.formatMessage({
                id: "login.apiKey.placeholder",
              })}
              value={apiKeyValue}
              placeholder={intl.formatMessage({
                id: "login.apiKey.placeholder",
              })}
              autoComplete="off"
              onChange={(event) => {
                setApiKeyValue(event.target.value);
                setError(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && apiKeyValue.trim() && !busy) {
                  void saveApiKeyProvider();
                }
              }}
            />
            {showApiKeyLink ? (
              <button
                type="button"
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ui-base font-medium text-brand underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                disabled={busy}
                onClick={() => {
                  if (apiKeyUrl) {
                    platform.openExternal(apiKeyUrl);
                  }
                }}
              >
                {intl.formatMessage({ id: "login.apiKey.getApiKey" })}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive" data-testid={TID_LOGIN_API_KEY_ERROR}>
          <TriangleAlertIcon className="size-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-2">
        <Button
          type="button"
          className="h-10 w-full text-ui-base"
          size="lg"
          data-testid={TID_LOGIN_API_KEY_CONTINUE_BUTTON}
          disabled={!apiKeyValue.trim() || !selectedTemplateId || busy}
          onClick={() => void saveApiKeyProvider()}
        >
          {phase ? <Loader2Icon className="size-4 animate-spin" /> : null}
          {intl.formatMessage({
            id: phase === "probe" ? "login.apiKey.testing" : "login.apiKey.continue",
          })}
        </Button>
        <Button
          type="button"
          variant="link"
          className="h-7 w-full text-ui-base text-foreground-subtle hover:text-foreground"
          data-testid={TID_LOGIN_API_KEY_SKIP_BUTTON}
          disabled={busy}
          onClick={() => void skipApiKeyProvider()}
        >
          {skipping ? <Loader2Icon className="size-4 animate-spin" /> : null}
          {intl.formatMessage({ id: "login.skip" })}
        </Button>
      </div>
    </div>
  );
}
