import type { AppSettings } from "@kcode/shared";
import type {
  ManagedSystemRoleEditorSnapshot,
  ManagedSystemRolePreset,
} from "./managedSystemRoleProjection.js";
import { ServiceChannels } from "@kcode/shared";
import { createServiceDescriptor } from "../descriptors.js";

export interface ISettingService {
  get(): Promise<AppSettings>;
  update(
    patch: Partial<AppSettings>,
    expectedAccountSettings?: Pick<
      AppSettings,
      "providerFamilyDomain" | "providerFamilyConnectionSelections"
    >,
  ): Promise<void>;
  /** Change the data base directory: copy data from old → new location, then persist the setting. */
  updateDataBaseDir(newDir: string | undefined): Promise<void>;
  ensureDefaultProject(homedir: string): Promise<{ path: string; created: boolean }>;
  readManagedSystemRoleContent(): Promise<ManagedSystemRoleEditorSnapshot>;
  writeManagedSystemRoleContent(content: string): Promise<void>;
  createManagedSystemRolePreset(input: {
    name: string;
    content: string;
  }): Promise<ManagedSystemRolePreset>;
  deleteManagedSystemRolePreset(id: string): Promise<void>;
}

export type { ManagedSystemRoleEditorSnapshot, ManagedSystemRolePreset } from "./managedSystemRoleProjection.js";

export const ISettingService = createServiceDescriptor<ISettingService>(ServiceChannels.Setting);
