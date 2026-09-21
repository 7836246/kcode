import { z } from "zod";
import type { CommandAgentSource } from "./command-types.js";
import type { KCodeProvider } from "./kcode-task-types-core.js";

export const KCODE_AGENT_PROVIDER = "glm" satisfies KCodeProvider;
export const KCODE_AGENT_PROVIDER_LABEL = "KCode Agent";
export const KCODE_COMMAND_AGENT_SOURCE = "kcodeAgent" satisfies CommandAgentSource;

export const kcodeAgentProviderSchema = z.literal(KCODE_AGENT_PROVIDER);

export const KCODE_COMMAND_AGENT_SOURCES = [
  KCODE_COMMAND_AGENT_SOURCE,
] as const satisfies readonly CommandAgentSource[];

export function normalizeAgentProviderToKCodeAgent(
  _provider?: KCodeProvider | null,
): KCodeProvider {
  return KCODE_AGENT_PROVIDER;
}

export function isKCodeAgentProvider(
  provider: KCodeProvider | null | undefined,
): provider is typeof KCODE_AGENT_PROVIDER {
  return provider === KCODE_AGENT_PROVIDER;
}
