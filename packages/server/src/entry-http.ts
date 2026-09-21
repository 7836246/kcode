import { createLocalServices, getAppConfigDir } from "@kcode/services/node";
import {
  materializeBundledKCodeBuiltinProviderConfig,
  readBundledKCodeBuiltinProviderConfig,
} from "./bundledKCodeBuiltinProviderConfig.js";
import { createHttpServer } from "./http.js";

async function main(): Promise<void> {
  const kcodeBuiltinProviderConfigFilePath = await materializeBundledKCodeBuiltinProviderConfig({
    environmentConfigRoot: getAppConfigDir(),
    content: readBundledKCodeBuiltinProviderConfig(),
  });
  const port = Number(process.env["PORT"]) || 3030;
  const host = process.env["KCODE_SERVER_HOST"]?.trim() || process.env["HOST"]?.trim() || undefined;
  const staticRoot = process.env["KCODE_WEB_STATIC_ROOT"]?.trim() || undefined;
  const authToken = process.env["KCODE_SERVER_AUTH_TOKEN"]?.trim() || undefined;
  const services = createLocalServices({
    kcodeBuiltinProviderConfigFilePath,
    providerProvisioningTargetEnabled: Boolean(authToken),
  });

  createHttpServer(services, port, {
    ...(host ? { host } : {}),
    ...(staticRoot ? { staticRoot, spaFallback: true } : {}),
    ...(authToken ? { authToken, authRequired: true } : {}),
  });
}

void main().catch((error: unknown) => {
  console.error("[kcode-server:http] startup failed", error);
  process.exitCode = 1;
});
