import { buildRuntimeKCodeApiUrl, resolveZaiBusinessBaseUrl } from "@kcode/shared";

export const KCODE_CLIENT_SCENES_URL = buildRuntimeKCodeApiUrl(
  process.env,
  "/api/v1/client/scenes",
);

export const ZAI_API_HOST = resolveZaiBusinessBaseUrl(process.env);
