import { isApiKeyAccess } from "@kcode/provider";
import {
  classifyModelConnectivityFailure,
  type ModelConnectivityFailureKind,
} from "../lib/modelConnectivityFailure.js";
import type { LoginApiKeyTemplate } from "./LoginApiKeyForm.helpers.js";

const CONNECTIVITY_PROBE_UNAVAILABLE = "未装配模型连通性测试能力";

export interface ConnectLoginApiKeyProviderInput {
  readonly apiKey: string;
  readonly templateId: string | null;
  readonly previousProviderId: string | null;
}

export interface ConnectLoginApiKeyProbeResult {
  readonly success: boolean;
  readonly error?: {
    readonly message: string;
    readonly code?: string;
  };
}

export interface ConnectLoginApiKeyProviderDeps {
  listTemplates: () => Promise<readonly LoginApiKeyTemplate[]>;
  createPersonalProvider: (input: {
    templateId: string;
    initialConfig: {
      access: { type: "api-key" | "zhipu-coding-plan-api-key"; apiKey: string };
    };
  }) => Promise<{ providerId: string }>;
  deletePersonalProvider: (providerId: string) => Promise<unknown>;
  readModelId: (providerId: string) => Promise<string | null>;
  ensureConversationWorkspace: () => Promise<{ path: string }>;
  testModelConnectivity: (input: {
    workspacePath: string;
    providerId: string;
    modelId: string;
  }) => Promise<ConnectLoginApiKeyProbeResult>;
}

export type ConnectLoginApiKeyProviderResult =
  | { readonly status: "invalid"; readonly reason: "empty-key" | "missing-template" }
  | { readonly status: "saved"; readonly providerId: string; readonly modelId: string | null }
  | {
      readonly status: "failed";
      readonly kind: ModelConnectivityFailureKind;
      readonly providerId: string | null;
      readonly detail: string;
    };

function errorDetail(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function failureKind(result: ConnectLoginApiKeyProbeResult): ModelConnectivityFailureKind {
  if (result.error?.code === "model-unavailable") return "model";
  return classifyModelConnectivityFailure(result.error?.message ?? "");
}

export async function connectLoginApiKeyProvider(
  input: ConnectLoginApiKeyProviderInput,
  deps: ConnectLoginApiKeyProviderDeps,
): Promise<ConnectLoginApiKeyProviderResult> {
  const apiKey = input.apiKey.trim();
  if (!apiKey) return { status: "invalid", reason: "empty-key" };

  const templates = (await deps.listTemplates()).filter((item) =>
    isApiKeyAccess(item.config.access),
  );
  const template = templates.find((item) => item.templateId === input.templateId);
  const access = template?.config.access;
  if (!template || !input.templateId || !isApiKeyAccess(access)) {
    return { status: "invalid", reason: "missing-template" };
  }

  if (input.previousProviderId) {
    try {
      await deps.deletePersonalProvider(input.previousProviderId);
    } catch (error) {
      return {
        status: "failed",
        kind: "other",
        providerId: input.previousProviderId,
        detail: errorDetail(error),
      };
    }
  }

  let providerId: string;
  try {
    const created = await deps.createPersonalProvider({
      templateId: input.templateId,
      initialConfig: { access: { type: access.type, apiKey } },
    });
    providerId = created.providerId;
  } catch (error) {
    return {
      status: "failed",
      kind: "other",
      providerId: null,
      detail: errorDetail(error),
    };
  }

  const modelId = await deps.readModelId(providerId);
  if (!modelId) {
    return { status: "failed", kind: "model", providerId, detail: "" };
  }

  let workspacePath: string;
  try {
    workspacePath = (await deps.ensureConversationWorkspace()).path;
  } catch (error) {
    return {
      status: "failed",
      kind: "other",
      providerId,
      detail: errorDetail(error),
    };
  }

  try {
    const result = await deps.testModelConnectivity({
      workspacePath,
      providerId,
      modelId,
    });
    if (result.success) {
      return { status: "saved", providerId, modelId };
    }
    const detail = result.error?.message ?? "";
    if (detail.includes(CONNECTIVITY_PROBE_UNAVAILABLE)) {
      return { status: "saved", providerId, modelId };
    }
    return { status: "failed", kind: failureKind(result), providerId, detail };
  } catch (error) {
    const detail = errorDetail(error);
    if (detail.includes(CONNECTIVITY_PROBE_UNAVAILABLE)) {
      return { status: "saved", providerId, modelId };
    }
    return {
      status: "failed",
      kind: classifyModelConnectivityFailure(detail),
      providerId,
      detail,
    };
  }
}
