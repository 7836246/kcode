import type { ClientConfigSnapshot } from "@kcode/shared";
import type { IClientConfigService } from "./clientConfig.js";

const FAIL_CLOSED_SNAPSHOT: ClientConfigSnapshot = Object.freeze({
  pluginStoreOrder: null,
});

/**
 * 公开客户端配置不再向 zcode.z.ai 拉灰度 / 强制更新 / 动态工作流。
 * 缺省 fail-closed：动态工作流由调用方视为关闭。
 */
export function createClientConfigService(): IClientConfigService {
  return {
    async getSnapshot() {
      return { ...FAIL_CLOSED_SNAPSHOT };
    },
  };
}
