/* Agent 侧的官方 MCP 身份头端口。
   官方智谱 / Z.ai / BigModel 账号登录已下线：不再向 host 索取 MaaS JWT，
   也不读取 oauth:zai|bigmodel 凭据。请求一律未支持。 */
import type { OfficialMcpAuthHeadersPort } from "@kcode/contracts";
import type { KCodeWorkspaceRef } from "@kcode/shared";
import type { KCodeProtocolAgentServerContext } from "./server-types.js";

export type OfficialMcpAuthRequestContext = Pick<
  KCodeProtocolAgentServerContext,
  "requestClient"
>;

/**
 * 官方 MCP JWT 签发已下线。端口 fail-closed：不发反向请求、不读残留 OAuth token。
 */
export function createOfficialMcpAuthHeadersPort(_input: {
  resolveContext: () => OfficialMcpAuthRequestContext | undefined;
  resolveWorkspace: (input: {
    workspaceIdentity?: string;
    workspacePath?: string;
  }) => KCodeWorkspaceRef | undefined;
}): OfficialMcpAuthHeadersPort {
  return {
    async resolveHeaders() {
      return { ok: false, reason: "official_auth_unavailable" };
    },
  };
}
