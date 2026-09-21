import type { TuiSelection } from "@kcode/tui";
import { getKCodeCopy } from "@kcode/i18n";

const OFFICIAL_LOGIN_UNSUPPORTED =
  "Official Z.ai / BigModel login is no longer supported. Configure a generic API-key provider instead.";

export function buildLoginSelection(locale?: string): TuiSelection {
  const copy = getKCodeCopy(locale).tui.loginSetup;
  return {
    emptyMessage: copy.emptyMessage,
    filterable: false,
    help: copy.help,
    items: [],
    prompt: copy.prompt,
    title: copy.title,
  };
}

export function loginSetupResponse(_locale?: string): string {
  return OFFICIAL_LOGIN_UNSUPPORTED;
}

export function formatLoginResult(_result: unknown): string {
  return OFFICIAL_LOGIN_UNSUPPORTED;
}

export function formatProviderSetupResult(_result: unknown): string {
  return OFFICIAL_LOGIN_UNSUPPORTED;
}

export async function emitLoginAuthorizeMessage(): Promise<void> {
  // 官方 OAuth 授权页已下线。
}

export function parseApiKeyLoginArgs(_args: string): null {
  return null;
}

export function officialLoginUnsupportedMessage(): string {
  return OFFICIAL_LOGIN_UNSUPPORTED;
}
