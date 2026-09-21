import type { KCodeProviderUpdateAccountConfigResult } from "@kcode/shared";
import { ProtocolRequestError, type KCodeProtocolAgentServerContext } from "./server-types.js";

/**
 * 官方 Account Provider Config 已下线。协议不再接受 Host 下发的官方账号 overlay。
 */
export async function updateAccountProviderConfig(
  _context: KCodeProtocolAgentServerContext,
  _params: unknown,
): Promise<KCodeProviderUpdateAccountConfigResult> {
  throw new ProtocolRequestError(-32018, "Official account provider config is no longer supported");
}
