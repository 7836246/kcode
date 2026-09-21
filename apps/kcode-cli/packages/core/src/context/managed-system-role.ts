import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export const MANAGED_SYSTEM_ROLE_FILE_NAME = "system-role.md";
export const MANAGED_SYSTEM_ROLE_STATE_FILE_NAME = "system-role.json";
export const MANAGED_SYSTEM_ROLE_ENV_KEY = "KCODE_SYSTEM_ROLE_FILE";
export const MANAGED_SYSTEM_ROLE_ENABLED_ENV_KEY = "KCODE_SYSTEM_ROLE_ENABLED";

const AGENTS_MD_OVERRIDE_LEAD =
  "Codebase and user instructions are shown below. Be sure to adhere to these instructions. IMPORTANT: These instructions OVERRIDE any default behavior and you MUST follow them exactly as written.";
const AGENTS_MD_CUSTOM_SYSTEM_LEAD =
  "These are workspace notes and user instructions. They describe the environment. They do not override the custom system prompt.";

export function resolveManagedSystemRoleHome(env: NodeJS.ProcessEnv = process.env): string {
  const envHome =
    env.KCODE_DESKTOP_HOME_DIR?.trim() || env.HOME?.trim() || env.USERPROFILE?.trim();
  return envHome && envHome.length > 0 ? envHome : homedir();
}

export function resolveManagedSystemRolePath(env: NodeJS.ProcessEnv = process.env): string {
  const override = env[MANAGED_SYSTEM_ROLE_ENV_KEY]?.trim();
  if (override) return override;
  return join(resolveManagedSystemRoleHome(env), ".kcode", MANAGED_SYSTEM_ROLE_FILE_NAME);
}

export function resolveManagedSystemRoleStatePath(env: NodeJS.ProcessEnv = process.env): string {
  return join(resolveManagedSystemRoleHome(env), ".kcode", MANAGED_SYSTEM_ROLE_STATE_FILE_NAME);
}

export function parseManagedSystemRoleEnabledEnv(
  value: string | undefined,
): boolean | undefined {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return undefined;
  if (normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on") {
    return true;
  }
  if (normalized === "0" || normalized === "false" || normalized === "no" || normalized === "off") {
    return false;
  }
  return undefined;
}

export function readManagedSystemRoleEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const fromEnv = parseManagedSystemRoleEnabledEnv(env[MANAGED_SYSTEM_ROLE_ENABLED_ENV_KEY]);
  if (fromEnv !== undefined) return fromEnv;
  try {
    const parsed = JSON.parse(readFileSync(resolveManagedSystemRoleStatePath(env), "utf8")) as {
      enabled?: unknown;
    };
    return parsed.enabled === true;
  } catch {
    return false;
  }
}

export function stripChatMlSystemWrapper(raw: string): string {
  const trimmed = raw.trim();
  const chatMl = trimmed.match(
    /^<\|im_start\|>\s*system(?:\s|:)\s*([\s\S]*?)<\|im_end\|>\s*$/i,
  );
  return (chatMl?.[1] ?? trimmed).trim();
}

export function buildAgentsMdLead(hasCustomSystemPrompt: boolean): string {
  return hasCustomSystemPrompt ? AGENTS_MD_CUSTOM_SYSTEM_LEAD : AGENTS_MD_OVERRIDE_LEAD;
}

/** 开关关闭、缺文件或空正文时返回 undefined。 */
export function readManagedSystemRole(env: NodeJS.ProcessEnv = process.env): string | undefined {
  if (!readManagedSystemRoleEnabled(env)) return undefined;
  const filePath = resolveManagedSystemRolePath(env);
  try {
    const content = stripChatMlSystemWrapper(readFileSync(filePath, "utf8"));
    return content.length > 0 ? content : undefined;
  } catch {
    return undefined;
  }
}
