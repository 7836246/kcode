import { buildRuntimeKCodeApiUrl } from "@kcode/shared";

export const KCODE_CLIENT_SCENES_URL = buildRuntimeKCodeApiUrl(
  process.env,
  "/api/v1/client/scenes",
);
