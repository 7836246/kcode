import type { TuiReadClipboardImage, TuiWriteClipboardText } from "@kcode/tui";
import type { UiLocale } from "@kcode/i18n";
import type { Logger } from "@kcode/contracts";
import type {
  createManagedCdpBrowserRuntime,
  ManagedCdpBrowserRuntimeOptions,
} from "@kcode/adapters/browser";
import type {
  createModelAdapter,
  createKCodeApp,
  CreateModelAdapterOptions,
  configureCodingPlanApiKey,
  ConfigureCodingPlanApiKeyOptions,
  inspectKCodeSkill,
  inspectWorkspaceHookTrust,
  grantWorkspaceHookTrust,
  revokeWorkspaceHookTrustCli,
  inspectKCodeCustomCommand,
  InspectKCodeCustomCommandOptions,
  InspectKCodeSkillOptions,
  loginKCodeCli,
  loginBigmodelCodingPlan,
  LoginBigmodelCodingPlanOptions,
  LoginKCodeCliOptions,
  listKCodeCustomCommands,
  ListKCodeCustomCommandsOptions,
  loadKCodeCustomCommand,
  listKCodeSessions,
  listKCodeSkills,
  ListKCodeSessionsOptions,
  ListKCodeSkillsOptions,
  logoutKCodeCli,
  LogoutKCodeCliOptions,
  resolveLatestSession,
  ResolveLatestSessionOptions,
  RunKCodeProtocolAgentOptions,
  prepareKCodeTelemetryEnv,
  startProcessProviderRegistryRuntime,
  shutdownKCodeTelemetry,
  KCodeAppOptions,
} from "@kcode/bootstrap";
import type { CliEnv, DotenvLoadResult, LoadCliDotenvOptions } from "./env.js";
import type { PluginsCommandOverrides } from "./plugins-command.js";
import type { CliShutdownProcess } from "./shutdown.js";
import type { resolveWorkspaceGitBranch } from "./tui-workspace-git.js";

export type BootstrapModule = typeof import("@kcode/bootstrap");

export interface RunDependencies extends PluginsCommandOverrides {
  protocolLifecycle?: RunKCodeProtocolAgentOptions["lifecycle"];
  protocolInput?: NodeJS.ReadableStream;
  createManagedCdpBrowserRuntime?: (
    options?: ManagedCdpBrowserRuntimeOptions,
  ) => ReturnType<typeof createManagedCdpBrowserRuntime>;
  createModelAdapter?: (
    options?: CreateModelAdapterOptions,
  ) => ReturnType<typeof createModelAdapter>;
  createKCodeApp?: (
    options?: KCodeAppOptions,
  ) => Awaited<ReturnType<typeof createKCodeApp>> | ReturnType<typeof createKCodeApp>;
  /**
   * Session-event shaper for --output-format stream-json. Defaults to the
   * bootstrap module's, which is also what the protocol server uses; injectable
   * so a caller that supplies its own `createKCodeApp` (tests, embedders) can
   * still stream, since the bootstrap module is not loaded on that path.
   */
  mapSessionEvent?: BootstrapModule["mapSessionEvent"];
  cwd?: () => string;
  env?: CliEnv;
  inspectSkill?: (options: InspectKCodeSkillOptions) => ReturnType<typeof inspectKCodeSkill>;
  inspectWorkspaceHookTrust?: typeof inspectWorkspaceHookTrust;
  grantWorkspaceHookTrust?: typeof grantWorkspaceHookTrust;
  revokeWorkspaceHookTrustCli?: typeof revokeWorkspaceHookTrustCli;
  inspectCustomCommand?: (
    options: InspectKCodeCustomCommandOptions,
  ) => ReturnType<typeof inspectKCodeCustomCommand>;
  loginKCodeCli?: (options?: LoginKCodeCliOptions) => ReturnType<typeof loginKCodeCli>;
  loginBigmodelCodingPlan?: (
    options?: LoginBigmodelCodingPlanOptions,
  ) => ReturnType<typeof loginBigmodelCodingPlan>;
  configureCodingPlanApiKey?: (
    options: ConfigureCodingPlanApiKeyOptions,
  ) => ReturnType<typeof configureCodingPlanApiKey>;
  loadDotenv?: (options?: LoadCliDotenvOptions) => DotenvLoadResult;
  prepareKCodeTelemetryEnv?: typeof prepareKCodeTelemetryEnv;
  projectConfigPath?: string;
  listSessions?: (options: ListKCodeSessionsOptions) => ReturnType<typeof listKCodeSessions>;
  listCustomCommands?: (
    options: ListKCodeCustomCommandsOptions,
  ) => ReturnType<typeof listKCodeCustomCommands>;
  loadCustomCommand?: (
    options: InspectKCodeCustomCommandOptions,
  ) => ReturnType<typeof loadKCodeCustomCommand>;
  // headless slash 路由要和 app facade 的保留名 gate 用同一个判据；默认取 bootstrap 的，
  // 注入点只为让单测不必拉起整个 bootstrap 模块。见 prompt-command.ts。
  isReservedSlashCommandName?: BootstrapModule["isReservedKCodeSlashCommandName"];
  listSkills?: (options: ListKCodeSkillsOptions) => ReturnType<typeof listKCodeSkills>;
  logger?: Logger;
  readClipboardImage?: TuiReadClipboardImage;
  writeClipboardText?: TuiWriteClipboardText;
  resolveLatestSession?: (
    options: ResolveLatestSessionOptions,
  ) => ReturnType<typeof resolveLatestSession>;
  resolveWorkspaceGitBranch?: typeof resolveWorkspaceGitBranch;
  logoutKCodeCli?: (options?: LogoutKCodeCliOptions) => ReturnType<typeof logoutKCodeCli>;
  runKCodeProtocolAgent?: (options?: RunKCodeProtocolAgentOptions) => Promise<void>;
  runTui?: typeof import("@kcode/tui").runTui;
  skipUserConfig?: boolean;
  userConfigPath?: string;
  exitProcess?: (code: number) => void;
  shutdownCleanupTimeoutMs?: number;
  shutdownProcess?: CliShutdownProcess;
  startProcessProviderRegistryRuntime?: typeof startProcessProviderRegistryRuntime;
  shutdownKCodeTelemetry?: typeof shutdownKCodeTelemetry;
}

export type CliPermissionMode = "build" | "plan" | "edit" | "yolo";
export type CliRuntimeMode = CliPermissionMode | "auto";

export interface CliModeState {
  current?: CliRuntimeMode;
  override?: CliPermissionMode;
}

export interface CliTargetRequest {
  objective: string;
  replaceExisting: boolean;
}

export type ModeCapableApp = Awaited<ReturnType<typeof createKCodeApp>> & {
  getMode?: () => CliRuntimeMode;
  setLocale?: (locale: UiLocale) => Promise<{ locale: "en-US" | "zh-CN" }>;
  setMode?: (mode: CliRuntimeMode) => Promise<{ mode: CliRuntimeMode }>;
};

export interface CliResumeRequest {
  continueSession: boolean;
  resumeSessionId?: string;
}
