export type ModelConnectivityFailureKind = "auth" | "endpoint" | "model" | "other";

const AUTH_FAILURE =
  /(?:\b401\b|\b403\b|unauthori[sz]ed|invalid[_ -]?api[_ -]?key|incorrect api key|authentication|invalid token|permission denied|认证失败|密钥无效)/i;

const MODEL_FAILURE =
  /(?:model[_ -]?not[_ -]?found|unknown model|no such model|model does not exist|the model\b[\s\S]+\bdoes not exist|模型未找到|模型不存在)/i;

const ENDPOINT_FAILURE =
  /(?:ENOTFOUND|ECONNREFUSED|ETIMEDOUT|ECONNRESET|ENETUNREACH|EHOSTUNREACH|UND_ERR_|EAI_AGAIN|getaddrinfo|fetch failed|certificate|timed out|超时|未配置 endpoint|no endpoint|network error)/i;

/** 把连通性探测的自由文本分成 Key、接口地址、模型三类。认不出时保留原文。 */
export function classifyModelConnectivityFailure(message: string): ModelConnectivityFailureKind {
  const text = message.trim();
  if (!text) return "other";
  if (AUTH_FAILURE.test(text)) return "auth";
  if (MODEL_FAILURE.test(text)) return "model";
  if (ENDPOINT_FAILURE.test(text)) return "endpoint";
  return "other";
}

export function resolveConnectivityFailureCopy(error: {
  readonly code?: string;
  readonly message: string;
}): { readonly messageId: string } | { readonly raw: string } {
  if (error.code === "provider-unavailable") {
    return { messageId: "settings.modelProvider.testModel.providerUnavailable" };
  }
  if (error.code === "model-unavailable") {
    return { messageId: "settings.modelProvider.testModel.modelUnavailable" };
  }
  const kind = classifyModelConnectivityFailure(error.message);
  if (kind === "auth") {
    return { messageId: "settings.modelProvider.testModel.error.auth" };
  }
  if (kind === "endpoint") {
    return { messageId: "settings.modelProvider.testModel.error.endpoint" };
  }
  if (kind === "model") {
    return { messageId: "settings.modelProvider.testModel.error.model_not_found" };
  }
  return { raw: error.message.trim() };
}
