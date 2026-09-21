// Bootstrap public API surface.

export * from "./app/create-app.js";
export type {
  ListKCodeSessionsOptions,
  PromptInput,
  ResolveLatestSessionOptions,
  ResumeOptions,
  RunKCodeProtocolAgentOptions,
  SendInputOptions,
  SendInputResult,
  SetLocaleResult,
  SteerTurnOptions,
  SubmitPromptOptions,
  UserPromptInput,
  KCodeApp,
  KCodeAppOptions,
  KCodeModelOption,
} from "./app/types.js";
export * from "./auth-login.js";
export {
  inspectKCodeCustomCommand,
  listKCodeCustomCommands,
  loadKCodeCustomCommand,
} from "./custom-commands.js";
export type {
  InspectKCodeCustomCommandOptions,
  ListKCodeCustomCommandsOptions,
  KCodeCustomCommandInspection,
} from "./custom-commands.js";
export { createModelAdapter } from "./model-factory.js";
export type { CreateModelAdapterOptions } from "./model-factory.js";
export { startProcessProviderRegistryRuntime } from "./app/process-provider-registry-runtime.js";
export type { ProcessProviderRegistryRuntimeOptions } from "./app/process-provider-registry-runtime.js";
export {
  addKCodePluginMarketplace,
  getKCodePluginsOverview,
  installKCodeMarketplacePlugin,
  listKCodePlugins,
  removeKCodePluginMarketplace,
  resolveKCodePlugins,
  setKCodePluginEnabled,
  uninstallKCodeMarketplacePlugin,
  updateKCodeMarketplacePlugin,
  updateKCodePluginMarketplace,
  validateKCodePluginPath,
} from "./plugins.js";
export type {
  AddKCodeMarketplaceOptions,
  InstallKCodeMarketplacePluginOptions,
  ListKCodePluginsOptions,
  RemoveKCodeMarketplaceOptions,
  ResolveKCodePluginsOptions,
  SetKCodePluginEnabledOptions,
  SetKCodePluginEnabledResult,
  UninstallKCodeMarketplacePluginOptions,
  UpdateKCodeMarketplaceOptions,
  UpdateKCodeMarketplacePluginOptions,
  ValidateKCodePluginPathOptions,
  KCodeAvailablePluginData,
  KCodeInstalledPluginData,
  KCodeMarketplaceSummaryData,
  KCodeMarketplaceUpdateData,
  KCodePluginInstallData,
  KCodePluginUpdateData,
  KCodePluginsOverviewData,
} from "./plugins.js";
export { runKCodeProtocolAgent } from "./kcode-protocol-entrypoint.js";
// Exposed for the CLI's --output-format stream-json: it needs the same event
// shape the protocol server emits, rather than inventing a second one.
export { mapSessionEvent } from "./kcode-protocol/session-mapper.js";
export { prepareKCodeTelemetryEnv, shutdownKCodeTelemetry } from "./telemetry-bootstrap.js";
export type { SessionTranscriptMessage, SessionTranscriptPart } from "./session-transcript.js";
export { listKCodeSessions, resolveLatestSession } from "./sessions.js";
export { inspectKCodeSkill, listKCodeSkills } from "./skills.js";
export type {
  InspectKCodeSkillOptions,
  ListKCodeSkillsOptions,
  KCodeSkillInspection,
} from "./skills.js";
// Exposed for the CLI's headless slash routing: it must decide "is this a real
// custom command?" with the *same* reserved-name gate the app facade's
// customCommandPromptResolver applies, or the two disagree and a reserved name
// reaches the model as literal prompt text. See prompt-command.ts.
export { isReservedKCodeSlashCommandName } from "./slash-command-surface.js";
export {
  grantWorkspaceHookTrust,
  inspectWorkspaceHookTrust,
  revokeWorkspaceHookTrustCli,
} from "./workspace-hook-trust-cli.js";
export type {
  WorkspaceHookTrustCliItem,
  WorkspaceHookTrustCliStatus,
  WorkspaceHookTrustCliTarget,
} from "./workspace-hook-trust-cli.js";
