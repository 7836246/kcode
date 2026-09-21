import { resolve } from "node:path";
import { createConfig } from "@kcode/adapters/config";
import { createNodeSkillAdapter } from "@kcode/adapters/skills";
import type { Logger, SkillContent, SkillDiagnostic, SkillLoadOutcome } from "@kcode/contracts";
import { resolveKCodePlugins } from "./plugins.js";
import { collectDisabledPaths } from "./skill-command-overrides.js";

export interface ListKCodeSkillsOptions {
  env?: NodeJS.ProcessEnv;
  logger?: Logger;
  projectConfigPath?: string;
  skipUserConfig?: boolean;
  userConfigPath?: string;
  workingDirectory?: string;
}

export interface InspectKCodeSkillOptions extends ListKCodeSkillsOptions {
  name: string;
}

export interface KCodeSkillInspection {
  diagnostics: SkillDiagnostic[];
  skill: SkillContent;
}

export async function listKCodeSkills(
  options: ListKCodeSkillsOptions = {},
): Promise<SkillLoadOutcome> {
  const discovery = createSkillDiscovery(options);
  if (!discovery.enabled) {
    return {
      diagnostics: [],
      skills: [],
      totalDiscovered: 0,
    };
  }

  return await discovery.skillPort.discoverSkills({
    workingDirectory: discovery.workingDirectory,
  });
}

export async function inspectKCodeSkill(
  options: InspectKCodeSkillOptions,
): Promise<KCodeSkillInspection> {
  const discovery = createSkillDiscovery(options);
  if (!discovery.enabled) {
    throw new Error("Skills are disabled.");
  }

  const outcome = await discovery.skillPort.discoverSkills({
    workingDirectory: discovery.workingDirectory,
  });
  if (
    !outcome.skills.some(
      (skill) => skill.name === options.name || skill.qualifiedName === options.name,
    )
  ) {
    throw new Error(`Skill not found: ${options.name}`);
  }

  const skill = await discovery.skillPort.loadSkill({
    name: options.name,
    workingDirectory: discovery.workingDirectory,
  });

  return {
    diagnostics: outcome.diagnostics,
    skill,
  };
}

function createSkillDiscovery(options: ListKCodeSkillsOptions):
  | {
      enabled: false;
      workingDirectory: string;
    }
  | {
      enabled: true;
      skillPort: ReturnType<typeof createNodeSkillAdapter>;
      workingDirectory: string;
    } {
  const workingDirectory = resolve(options.workingDirectory ?? process.cwd());
  const configResult = createConfig({
    env: options.env,
    projectConfigPath: options.projectConfigPath,
    workingDirectory,
    skipUserConfig: options.skipUserConfig,
    userConfigPath: options.userConfigPath,
  });

  if (!configResult.config.features.skill || !configResult.config.skills.enabled) {
    return {
      enabled: false,
      workingDirectory,
    };
  }
  const pluginOutcome = resolveKCodePlugins({
    configResult,
    env: options.env,
    logger: options.logger,
    projectConfigPath: options.projectConfigPath,
    skipUserConfig: options.skipUserConfig,
    userConfigPath: options.userConfigPath,
    workingDirectory,
  });

  return {
    enabled: true,
    skillPort: createNodeSkillAdapter({
      extraRoots: configResult.config.skills.roots,
      extraResolvedRoots: pluginOutcome.skillRoots,
      disabledPaths: collectDisabledPaths(configResult.config.skillOverrides),
    }),
    workingDirectory,
  };
}
