import type { OfficialMcpAuthFailureReason } from "@kcode/shared";

export type OfficialMcpCredentialOutcome = {
  ok: false;
  reason: OfficialMcpAuthFailureReason;
};

type OfficialMcpAuthHeadersOutcome = {
  ok: false;
  reason: OfficialMcpAuthFailureReason;
};

/** 官方 MCP JWT 签发已下线；不读取 oauth:zai|bigmodel 残留凭据。 */
export async function resolveOfficialMcpCredentials(): Promise<OfficialMcpCredentialOutcome> {
  return { ok: false, reason: "official_auth_unavailable" };
}

export function buildOfficialMcpAuthHeaders(): Record<string, string> {
  return {};
}

export function createOfficialMcpAuthHeadersResolver(): {
  resolveHeaders(): Promise<OfficialMcpAuthHeadersOutcome>;
} {
  return {
    async resolveHeaders() {
      return { ok: false, reason: "official_auth_unavailable" };
    },
  };
}
