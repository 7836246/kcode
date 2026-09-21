import type { ForceUpdateRequirement, Locale } from "@kcode/shared";
import type { ForceAutoUpdateState } from "./autoUpdater.js";

export interface ForceUpdateDialogText {
  title: string;
  message: string;
  detail: string;
  autoUpdateButton: string;
  manualUpdateButton: string;
  quitButton: string;
}

export interface ForceUpdateGuardLogger {
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
}

interface ForceUpdateGuardResult {
  blocked: boolean;
  requirement?: ForceUpdateRequirement;
}

interface ForceUpdateGuardOptions {
  locale: Locale;
  logger: ForceUpdateGuardLogger;
  endpointOrigin?: string;
  fetchRemoteConfig?: () => Promise<unknown>;
  requestAutoUpdate?: (
    onStateChange?: (state: ForceAutoUpdateState) => void,
  ) => (() => void) | void;
  onBlocked?: (requirement: ForceUpdateRequirement) => void;
}

/**
 * 官方强制升级配置已下线。不再请求 zcode.z.ai /api/v1/client/configs；
 * 缺省 fail-closed：不因官方远端配置拦截启动。
 */
export async function maybeBlockStartupForForceUpdate(
  options: ForceUpdateGuardOptions,
): Promise<ForceUpdateGuardResult> {
  options.logger.info("[force-update] 官方强制升级配置已下线，启动不拦截");
  return { blocked: false };
}
