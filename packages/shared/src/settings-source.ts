export type SettingsDirectorySource = "kcode" | "agents" | "claude";

export type SettingsDirectoryScope = "user" | "project";

export interface SettingsDirectoryLocation {
  source: SettingsDirectorySource;
  scope: SettingsDirectoryScope;
  directoryPath: string;
  projectPath?: string;
}
