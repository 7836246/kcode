import { createLocalServices, type KCodeAgentCommandResolver } from "@kcode/services/node";
import {
  parseServiceAuthorityMode,
  KCODE_REMOTE_HTTP_PROXY_ENV_KEY,
  KCODE_REMOTE_NO_PROXY_ENV_KEY,
  KCODE_REMOTE_RUNTIME_NETWORK_AUTHORITY_ENV_KEY,
} from "@kcode/shared";

interface CreateStdioServicesOptions {
  env?: Record<string, string | undefined>;
  kcodeBuiltinProviderConfigFilePath: string;
  kcodeAgentCommandResolver?: KCodeAgentCommandResolver;
}

interface RemoteAgentNetworkOptions {
  httpProxy?: string;
  noProxy?: string;
}

function resolveRemoteAgentNetworkFromEnv(
  env: Record<string, string | undefined>,
): RemoteAgentNetworkOptions | undefined {
  if (env[KCODE_REMOTE_RUNTIME_NETWORK_AUTHORITY_ENV_KEY]?.trim() !== "1") {
    return undefined;
  }
  return {
    httpProxy: env[KCODE_REMOTE_HTTP_PROXY_ENV_KEY]?.trim() || undefined,
    noProxy: env[KCODE_REMOTE_NO_PROXY_ENV_KEY]?.trim() || undefined,
  };
}

export function createStdioServices(options: CreateStdioServicesOptions) {
  const env = options.env ?? process.env;
  const authorityModeParseResult = parseServiceAuthorityMode(env);
  const remoteAgentNetwork = resolveRemoteAgentNetworkFromEnv(env);
  // 远程 Desktop 的呈现能力必须从 stdio 入口收到的 authority mode 进入 Services 推导链。
  // 测试注入 resolver 只用于在 spawn 前观察最终命令，不改变生产默认 resolver。
  const services = createLocalServices({
    kcodeBuiltinProviderConfigFilePath: options.kcodeBuiltinProviderConfigFilePath,
    serviceAuthorityMode: authorityModeParseResult.mode,
    kcodeAgentCommandResolver: options.kcodeAgentCommandResolver,
    remoteAgentNetwork,
  });

  return {
    authorityModeParseResult,
    services,
  };
}
