/**
 * 磁盘残留的官方智谱账号供应商不再视为可用。
 * 只认自行配置的 API Key / 自定义供应商。
 */
export function isLeftoverOfficialAccountProvider(params: {
  providerId: string;
  accessType?: string | null;
}): boolean {
  if (params.accessType === "zhipu-account") {
    return true;
  }
  return params.providerId.startsWith("account:");
}
