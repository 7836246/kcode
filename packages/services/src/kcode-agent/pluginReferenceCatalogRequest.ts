import {
  kcodeProtocolMethods,
  kcodePluginsReferenceCatalogResultSchema,
  type KCodePluginsReferenceCatalogParams,
} from "@kcode/shared";
import type { KCodeProtocolClient } from "#src/kcode-agent/kcodeProtocolClient.js";

/** 旧协议严格校验响应；新展示字段走独立入口，只有 -32601 能证明旧 Agent 不支持。 */
export async function requestPluginReferenceCatalog(
  client: Pick<KCodeProtocolClient, "request">,
  params: KCodePluginsReferenceCatalogParams,
) {
  try {
    return await client.request(
      kcodeProtocolMethods.pluginsReferenceCatalogWithCategory,
      params,
      kcodePluginsReferenceCatalogResultSchema,
    );
  } catch (error) {
    if (!(typeof error === "object" && error !== null && "code" in error && error.code === -32601))
      throw error;
    return client.request(
      kcodeProtocolMethods.pluginsReferenceCatalog,
      params,
      kcodePluginsReferenceCatalogResultSchema,
    );
  }
}
