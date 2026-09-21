/**
 * useCredentials —— 凭据服务 hooks
 */
import { useCallback } from "react";
import { useServices } from "./useServices.js";

/** 凭据管理的基础 hook */
export function useCredentials() {
  const { credentialService } = useServices();

  const load = useCallback((key: string) => credentialService.load(key), [credentialService]);
  const save = useCallback(
    (key: string, value: string) => credentialService.save(key, value),
    [credentialService],
  );
  const del = useCallback((key: string) => credentialService.delete(key), [credentialService]);

  return { load, save, delete: del };
}

/** 官方 OAuth token 已下线；保留导出以免外部包立刻断编译。 */
export function useAuthToken() {
  const getToken = useCallback(async () => null, []);
  const setToken = useCallback(async (_token: string) => {
    throw new Error("官方账号 token 已下线，请改用供应商 API Key");
  }, []);
  const clearToken = useCallback(async () => undefined, []);

  return { getToken, setToken, clearToken };
}
