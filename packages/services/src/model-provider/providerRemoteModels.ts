import type { ModelId, ProviderApiType } from "@kcode/provider";
import { normalizeApiKeyForHeader } from "../providers/api/apiKeyHeaders.js";
import { parseProviderModelCatalog, type CatalogModelInfo } from "./modelInfoCatalog.js";

const ANTHROPIC_VERSION = "2023-06-01";

export class ProviderRemoteModelsError extends Error {
    readonly code: "missing-connection" | "http-error" | "invalid-response";

    constructor(code: ProviderRemoteModelsError["code"], message: string) {
        super(message);
        this.name = "ProviderRemoteModelsError";
        this.code = code;
    }
}

export function resolveProviderModelsUrl(
    apiType: ProviderApiType | undefined,
    baseUrl: string,
): string {
    const trimmed = baseUrl.trim().replace(/\/+$/, "");
    if (!trimmed) {
        throw new ProviderRemoteModelsError("missing-connection", "Base URL 不能为空");
    }
    if (/\/models$/i.test(trimmed)) return trimmed;
    if (apiType === "anthropic-messages") {
        return /\/v1$/i.test(trimmed) ? `${trimmed}/models` : `${trimmed}/v1/models`;
    }
    return `${trimmed}/models`;
}

export function parseProviderRemoteModelIds(payload: unknown): ModelId[] {
    return parseProviderModelCatalog(payload).modelIds;
}

export function parseProviderRemoteModelCatalog(payload: unknown): {
    readonly modelIds: readonly ModelId[];
    readonly info: Readonly<Record<string, CatalogModelInfo>>;
} {
    return parseProviderModelCatalog(payload);
}

export function buildProviderModelsRequestHeaders(input: {
    readonly apiType?: ProviderApiType;
    readonly apiKey: string;
    readonly headers?: Readonly<Record<string, string>> | null;
}): Headers {
    const apiKey = normalizeApiKeyForHeader(input.apiKey);
    if (!apiKey) {
        throw new ProviderRemoteModelsError("missing-connection", "API Key 不能为空");
    }
    const headers = new Headers(input.headers ?? undefined);
    if (input.apiType === "anthropic-messages") {
        if (!headers.has("x-api-key")) headers.set("x-api-key", apiKey);
        if (!headers.has("anthropic-version")) headers.set("anthropic-version", ANTHROPIC_VERSION);
    } else if (!headers.has("authorization")) {
        headers.set("Authorization", `Bearer ${apiKey}`);
    }
    if (!headers.has("accept")) headers.set("Accept", "application/json");
    return headers;
}

export async function fetchProviderRemoteModels(input: {
    readonly apiType?: ProviderApiType;
    readonly baseUrl: string;
    readonly apiKey: string;
    readonly headers?: Readonly<Record<string, string>> | null;
    readonly fetchImpl?: typeof fetch;
    readonly signal?: AbortSignal;
}): Promise<{
    readonly modelIds: readonly ModelId[];
    readonly info: Readonly<Record<string, CatalogModelInfo>>;
}> {
    const url = resolveProviderModelsUrl(input.apiType, input.baseUrl);
    const headers = buildProviderModelsRequestHeaders(input);
    const fetchImpl = input.fetchImpl ?? globalThis.fetch;
    let response: Response;
    try {
        response = await fetchImpl(url, {
            method: "GET",
            headers,
            ...(input.signal ? { signal: input.signal } : {}),
        });
    } catch (error) {
        if (error instanceof ProviderRemoteModelsError) throw error;
        throw new ProviderRemoteModelsError(
            "http-error",
            error instanceof Error ? error.message : "远端模型列表请求失败",
        );
    }
    if (!response.ok) {
        throw new ProviderRemoteModelsError(
            "http-error",
            `远端模型列表请求失败（HTTP ${response.status}）`,
        );
    }
    let payload: unknown;
    try {
        payload = await response.json();
    } catch {
        throw new ProviderRemoteModelsError("invalid-response", "远端返回的模型列表不是 JSON");
    }
    const catalog = parseProviderRemoteModelCatalog(payload);
    if (catalog.modelIds.length === 0) {
        throw new ProviderRemoteModelsError(
            "invalid-response",
            "远端返回的模型列表为空或格式无法识别",
        );
    }
    return catalog;
}

export async function fetchProviderRemoteModelIds(
    input: Parameters<typeof fetchProviderRemoteModels>[0],
): Promise<readonly ModelId[]> {
    return (await fetchProviderRemoteModels(input)).modelIds;
}
