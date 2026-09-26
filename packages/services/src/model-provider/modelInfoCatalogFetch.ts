import type { CatalogModelInfo } from "./modelInfoCatalog.js";
import {
  findLiteLlmInfo,
  findModelsDevInfo,
  findOpenRouterInfo,
  mergeCatalogModelInfo,
} from "./modelInfoCatalog.js";

const MODELS_DEV_URL = "https://models.dev/api.json";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/models";
const LITELLM_URL =
  "https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json";
const CATALOG_TIMEOUT_MS = 8_000;

type CatalogKind = "models-dev" | "openrouter" | "litellm";

const catalogCache = new Map<CatalogKind, unknown>();
const catalogMisses = new Set<CatalogKind>();
const catalogInflight = new Map<CatalogKind, Promise<unknown>>();
const providerInfoCache = new Map<string, CatalogModelInfo>();

export function rememberProviderModelInfo(
  providerId: string,
  info: Readonly<Record<string, CatalogModelInfo>>,
): void {
  for (const [modelId, modelInfo] of Object.entries(info)) {
    providerInfoCache.set(cacheKey(providerId, modelId), modelInfo);
  }
}

export function cachedProviderModelInfo(
  providerId: string,
  modelId: string,
): CatalogModelInfo | undefined {
  return providerInfoCache.get(cacheKey(providerId, modelId));
}

/** 公开目录失败时返回空，不挡住供应商自己已经给出的模型信息。 */
export async function lookupPublicModelInfo(
  modelId: string,
  fetchImpl: typeof fetch = globalThis.fetch,
): Promise<CatalogModelInfo | undefined> {
  const [modelsDev, openRouter, liteLlm] = await Promise.all([
    loadCatalog("models-dev", MODELS_DEV_URL, fetchImpl),
    loadCatalog("openrouter", OPENROUTER_URL, fetchImpl),
    loadCatalog("litellm", LITELLM_URL, fetchImpl),
  ]);
  let info: CatalogModelInfo | undefined;
  const modelsDevInfo = modelsDev ? findModelsDevInfo(modelsDev, modelId) : undefined;
  const openRouterInfo = openRouter ? findOpenRouterInfo(openRouter, modelId) : undefined;
  const liteLlmInfo = liteLlm ? findLiteLlmInfo(liteLlm, modelId) : undefined;
  if (modelsDevInfo) info = mergeCatalogModelInfo(info, modelsDevInfo);
  if (openRouterInfo) info = mergeCatalogModelInfo(info, openRouterInfo);
  if (liteLlmInfo) info = mergeCatalogModelInfo(info, liteLlmInfo);
  return info;
}

export async function enrichProviderModelInfo(
  providerInfo: Readonly<Record<string, CatalogModelInfo>>,
  modelIds: readonly string[],
  fetchImpl?: typeof fetch,
): Promise<Record<string, CatalogModelInfo>> {
  const result: Record<string, CatalogModelInfo> = { ...providerInfo };
  await Promise.all(
    modelIds.map(async (modelId) => {
      const publicInfo = await lookupPublicModelInfo(modelId, fetchImpl);
      if (!publicInfo && !providerInfo[modelId]) return;
      result[modelId] = publicInfo
        ? mergeCatalogModelInfo(providerInfo[modelId], publicInfo)
        : providerInfo[modelId]!;
    }),
  );
  return result;
}

async function loadCatalog(
  kind: CatalogKind,
  url: string,
  fetchImpl: typeof fetch,
): Promise<unknown> {
  if (catalogCache.has(kind)) return catalogCache.get(kind);
  if (catalogMisses.has(kind)) return undefined;
  const pending = catalogInflight.get(kind);
  if (pending) return pending;
  const request = fetchCatalog(url, fetchImpl);
  catalogInflight.set(kind, request);
  try {
    const payload = await request;
    if (payload === undefined) catalogMisses.add(kind);
    else catalogCache.set(kind, payload);
    return payload;
  } finally {
    catalogInflight.delete(kind);
  }
}

async function fetchCatalog(url: string, fetchImpl: typeof fetch): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CATALOG_TIMEOUT_MS);
  try {
    const response = await fetchImpl(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) return undefined;
    return await response.json();
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

function cacheKey(providerId: string, modelId: string): string {
  return `${providerId}\u0000${modelId}`;
}
