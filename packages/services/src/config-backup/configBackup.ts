import {
  ServiceChannels,
  type ConfigBackupExportResult,
  type ConfigBackupImportResult,
  type ConfigBackupWebdavConnection,
  type ConfigBackupWebdavTestResult,
  type ConfigBackupWebdavUploadResult,
} from "@kcode/shared";
import { createServiceDescriptor } from "../descriptors.js";

export interface IConfigBackupService {
  exportEncryptedBackup(passphrase: string): Promise<ConfigBackupExportResult>;
  importEncryptedBackup(passphrase: string, bytesBase64: string): Promise<ConfigBackupImportResult>;
  importFromLocalPath(passphrase: string, path: string): Promise<ConfigBackupImportResult>;
  testWebdav(connection: ConfigBackupWebdavConnection): Promise<ConfigBackupWebdavTestResult>;
  uploadToWebdav(
    passphrase: string,
    connection: ConfigBackupWebdavConnection,
    overwrite: boolean,
  ): Promise<ConfigBackupWebdavUploadResult>;
  downloadFromWebdav(
    passphrase: string,
    connection: ConfigBackupWebdavConnection,
  ): Promise<ConfigBackupImportResult>;
}

export const IConfigBackupService = createServiceDescriptor<IConfigBackupService>(
  ServiceChannels.ConfigBackup,
);
