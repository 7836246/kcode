// ============================================================
// Context Builder exports
// ============================================================

export * from "./types.js";
export * from "./builder.js";
export * from "./utils.js";
export {
  MANAGED_SYSTEM_ROLE_ENABLED_ENV_KEY,
  MANAGED_SYSTEM_ROLE_ENV_KEY,
  MANAGED_SYSTEM_ROLE_FILE_NAME,
  MANAGED_SYSTEM_ROLE_STATE_FILE_NAME,
  buildAgentsMdLead,
  parseManagedSystemRoleEnabledEnv,
  readManagedSystemRole,
  readManagedSystemRoleEnabled,
  resolveManagedSystemRoleHome,
  resolveManagedSystemRolePath,
  resolveManagedSystemRoleStatePath,
  stripChatMlSystemWrapper,
} from "./managed-system-role.js";

// Section builders (for testing)
export { buildCliPrefixSection } from "./sections/cli-prefix.js";
export { buildIdentitySection } from "./sections/identity.js";
export { buildWorkflowActorIdentitySection } from "./sections/workflow-actor.js";
export { buildEnvInfoSection, buildGitSystemContextSection } from "./sections/env-info.js";
export { buildSkillsSection } from "./sections/skills.js";
export { buildCurrentDateSection } from "./sections/current-date.js";
export { buildMemorySection } from "./sections/memory.js";
export { buildDesktopContextSection } from "./sections/desktop.js";
