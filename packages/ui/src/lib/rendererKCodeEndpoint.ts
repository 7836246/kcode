import {
  buildRuntimeKCodeEndpointUrls,
  KCODE_ENV,
  type RuntimeKCodeEndpointEnv,
} from "@kcode/shared";

interface RendererImportMetaEnv {
  VITE_KCODE_BASE_URL?: string;
  VITE_KCODE_ENDPOINT_ORIGIN?: string;
}

function readRendererImportMetaEnv(): RendererImportMetaEnv {
  return ((import.meta as ImportMeta & { env?: RendererImportMetaEnv }).env ??
    {}) as RendererImportMetaEnv;
}

function createRendererKCodeEndpointEnv(
  env: RendererImportMetaEnv = readRendererImportMetaEnv(),
): RuntimeKCodeEndpointEnv {
  return {
    KCODE_ENV,
    // UI 侧的 zcode-plan 占位 provider 以前只看 KCODE_ENV，
    // 没有消费 Vite 注入的 base url，导致自定义测试域名时 renderer 和 host/service 可能不一致。
    KCODE_BASE_URL: env.VITE_KCODE_BASE_URL,
    KCODE_ENDPOINT_ORIGIN: env.VITE_KCODE_ENDPOINT_ORIGIN,
  };
}

export const RENDERER_KCODE_ENDPOINT_URLS = buildRuntimeKCodeEndpointUrls(
  createRendererKCodeEndpointEnv(),
);
