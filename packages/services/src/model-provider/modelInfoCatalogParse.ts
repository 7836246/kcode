import type { CatalogModelInfo } from "./modelInfoCatalog.js";

const KCODE_REASONING_LEVELS = [
    "disabled",
    "enabled",
    "minimal",
    "low",
    "medium",
    "high",
    "xhigh",
    "max",
    "ultra",
] as const;

export function modalityFlags(
    modalities: readonly string[] | undefined,
): Pick<CatalogModelInfo, "supportsImage" | "supportsVideo" | "supportsAudio" | "supportsPdf"> {
    if (!modalities) return {};
    const set = new Set(modalities.map((item) => item.toLowerCase()));
    return {
        supportsImage: set.has("image"),
        supportsVideo: set.has("video"),
        supportsAudio: set.has("audio"),
        supportsPdf: set.has("pdf"),
    };
}

export function compactInfo(info: CatalogModelInfo): CatalogModelInfo | undefined {
    const entries = Object.entries(info).filter(([, value]) => {
        if (value == null) return false;
        return !Array.isArray(value) || value.length > 0;
    });
    if (entries.length === 0) return undefined;
    return Object.fromEntries(entries) as CatalogModelInfo;
}

export function bestMatch(
    modelId: string,
    candidates: () => Generator<{ remoteId: string; info: CatalogModelInfo }>,
): CatalogModelInfo | undefined {
    const local = modelIdCandidates(modelId);
    let bestScore = 0;
    let best: CatalogModelInfo | undefined;
    for (const candidate of candidates()) {
        const score = matchScore(local, candidate.remoteId);
        if (score > bestScore) {
            bestScore = score;
            best = candidate.info;
        }
    }
    return best;
}

function modelIdCandidates(modelId: string): string[] {
    const trimmed = modelId.trim().toLowerCase();
    const candidates = new Set<string>([trimmed]);
    const slash = trimmed.indexOf("/");
    if (slash >= 0 && slash < trimmed.length - 1) candidates.add(trimmed.slice(slash + 1));
    const colon = trimmed.lastIndexOf(":");
    if (colon > 0) candidates.add(trimmed.slice(0, colon));
    return [...candidates];
}

function matchScore(candidates: readonly string[], remote: string): number {
    const normalized = remote.trim().toLowerCase();
    if (!normalized) return 0;
    const bare = normalized.includes("/")
        ? normalized.slice(normalized.lastIndexOf("/") + 1)
        : normalized;
    let best = 0;
    for (const candidate of candidates) {
        if (candidate === normalized) best = Math.max(best, 300);
        else if (candidate === bare) best = Math.max(best, 250);
        else if (normalized.endsWith(`/${candidate}`)) best = Math.max(best, 220);
        else if (candidate.endsWith(`/${bare}`)) best = Math.max(best, 200);
        else if (
            candidate.length >= 8 &&
            bare.length >= 8 &&
            (bare.startsWith(candidate) || candidate.startsWith(bare))
        ) {
            best = Math.max(best, 120);
        }
    }
    return best;
}

export function reasoningLevelsFromOptions(value: unknown): readonly string[] | undefined {
    if (!Array.isArray(value)) return undefined;
    const levels: string[] = [];
    for (const item of value) {
        if (!item || typeof item !== "object") continue;
        const record = item as Record<string, unknown>;
        if (record.type === "budget_tokens") return undefined;
        if (record.type === "toggle") {
            pushLevel(levels, "disabled");
            continue;
        }
        for (const level of mapReasoningLevels(arrayOfStrings(record.values)) ?? [])
            pushLevel(levels, level);
    }
    return levels.length > 0 ? levels : undefined;
}

export function reasoningLevelsFromOpenRouter(value: unknown): readonly string[] | undefined {
    if (!value || typeof value !== "object") return undefined;
    return mapReasoningLevels(
        arrayOfStrings((value as { supported_efforts?: unknown }).supported_efforts),
    );
}

export function mapReasoningLevels(values: readonly string[]): readonly string[] | undefined {
    const levels: string[] = [];
    for (const value of values) {
        const mapped = mapReasoningLevel(value);
        if (mapped) pushLevel(levels, mapped);
    }
    return levels.length > 0 ? levels : undefined;
}

function mapReasoningLevel(value: string): string | undefined {
    switch (value.trim().toLowerCase()) {
        case "none":
        case "off":
        case "disabled":
            return "disabled";
        case "minimal":
            return "minimal";
        case "low":
        case "medium":
        case "high":
        case "max":
        case "ultra":
        case "enabled":
            return value.trim().toLowerCase();
        case "xhigh":
        case "very_high":
        case "veryhigh":
            return "xhigh";
        case "maximum":
            return "max";
        default:
            return KCODE_REASONING_LEVELS.includes(
                value.trim().toLowerCase() as (typeof KCODE_REASONING_LEVELS)[number],
            )
                ? value.trim().toLowerCase()
                : undefined;
    }
}

function pushLevel(levels: string[], level: string) {
    if (!levels.includes(level)) levels.push(level);
}

export function modelEntries(payload: unknown): unknown[] {
    if (Array.isArray(payload)) return payload;
    if (!payload || typeof payload !== "object") return [];
    const record = payload as Record<string, unknown>;
    if (Array.isArray(record.data)) return record.data;
    if (Array.isArray(record.models)) return record.models;
    return [];
}

export function readId(entry: unknown): string | undefined {
    if (typeof entry === "string") {
        const modelId = entry.trim();
        return modelId || undefined;
    }
    if (!entry || typeof entry !== "object" || !("id" in entry)) return undefined;
    return typeof entry.id === "string" && entry.id.trim() ? entry.id.trim() : undefined;
}

export function inputModalities(value: unknown): string[] | undefined {
    const items = arrayOfStrings(nested(value, "input"));
    return items.length > 0 ? items : undefined;
}

export function modalityWords(value: string | undefined): string[] {
    if (!value) return [];
    return value
        .toLowerCase()
        .split(/[^a-z]+/)
        .filter(
            (item) => item === "image" || item === "video" || item === "audio" || item === "pdf",
        );
}

export function hasParameter(value: unknown, names: readonly string[]): boolean {
    const parameters = arrayOfStrings(value);
    return parameters.some((item) => names.includes(item));
}

export function nested(value: unknown, key: string): unknown {
    if (!value || typeof value !== "object") return undefined;
    return (value as Record<string, unknown>)[key];
}

export function nestedString(value: unknown, key: string): string | undefined {
    const child = nested(value, key);
    return typeof child === "string" ? child : undefined;
}

export function nestedNumber(value: unknown, key: string): number | undefined {
    return numberValue(nested(value, key));
}

export function nestedArray(value: unknown, key: string): unknown[] | undefined {
    const child = nested(value, key);
    return Array.isArray(child) ? child : undefined;
}

export function numberValue(value: unknown): number | undefined {
    return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function positiveInt(value: number | undefined): number | undefined {
    if (value == null || !Number.isInteger(value) || value <= 0) return undefined;
    return value;
}

export function arrayOfStrings(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is string => typeof item === "string");
}
