import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import {
  CONFIG_BACKUP_DECRYPT_ERROR_CODE,
  CONFIG_BACKUP_FORMAT,
  CONFIG_BACKUP_INVALID_PACKAGE_ERROR_CODE,
  CONFIG_BACKUP_MIN_PASSPHRASE_LENGTH,
  CONFIG_BACKUP_PASSPHRASE_TOO_SHORT_ERROR_CODE,
} from "@kcode/shared";

const CIPHER = "aes-256-gcm";
const KEY_BYTES = 32;
const IV_BYTES = 12;
const SALT_BYTES = 16;
const SCRYPT_N = 16_384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;

export interface ConfigBackupEnvelope {
  format: typeof CONFIG_BACKUP_FORMAT;
  kdf: "scrypt";
  kdfParams: { N: number; r: number; p: number; salt: string };
  cipher: typeof CIPHER;
  iv: string;
  authTag: string;
  ciphertext: string;
}

function codedError(code: string, message: string): Error & { code: string } {
  return Object.assign(new Error(message), { code });
}

export function assertPassphrase(passphrase: string): void {
  if (passphrase.length < CONFIG_BACKUP_MIN_PASSPHRASE_LENGTH) {
    throw codedError(
      CONFIG_BACKUP_PASSPHRASE_TOO_SHORT_ERROR_CODE,
      `Passphrase must be at least ${CONFIG_BACKUP_MIN_PASSPHRASE_LENGTH} characters`,
    );
  }
}

function deriveKey(passphrase: string, salt: Buffer): Buffer {
  return scryptSync(passphrase, salt, KEY_BYTES, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });
}

export async function encryptConfigBackupPayload(
  passphrase: string,
  plaintext: string,
): Promise<ConfigBackupEnvelope> {
  assertPassphrase(passphrase);
  const salt = randomBytes(SALT_BYTES);
  const iv = randomBytes(IV_BYTES);
  const key = deriveKey(passphrase, salt);
  const cipher = createCipheriv(CIPHER, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    format: CONFIG_BACKUP_FORMAT,
    kdf: "scrypt",
    kdfParams: { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, salt: salt.toString("base64") },
    cipher: CIPHER,
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
    ciphertext: encrypted.toString("base64"),
  };
}

export async function decryptConfigBackupPayload(
  passphrase: string,
  envelope: ConfigBackupEnvelope,
): Promise<string> {
  assertPassphrase(passphrase);
  if (envelope.format !== CONFIG_BACKUP_FORMAT || envelope.kdf !== "scrypt") {
    throw codedError(CONFIG_BACKUP_INVALID_PACKAGE_ERROR_CODE, "Unsupported backup package");
  }
  try {
    const salt = Buffer.from(envelope.kdfParams.salt, "base64");
    const iv = Buffer.from(envelope.iv, "base64");
    const authTag = Buffer.from(envelope.authTag, "base64");
    const ciphertext = Buffer.from(envelope.ciphertext, "base64");
    const key = deriveKey(passphrase, salt);
    const decipher = createDecipheriv(CIPHER, key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  } catch (error) {
    if (error instanceof Error && "code" in error) {
      throw error;
    }
    throw codedError(CONFIG_BACKUP_DECRYPT_ERROR_CODE, "Failed to decrypt backup package");
  }
}

export function parseConfigBackupEnvelope(raw: string): ConfigBackupEnvelope {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw codedError(CONFIG_BACKUP_INVALID_PACKAGE_ERROR_CODE, "Backup package is not valid JSON");
  }
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    (parsed as ConfigBackupEnvelope).format !== CONFIG_BACKUP_FORMAT
  ) {
    throw codedError(CONFIG_BACKUP_INVALID_PACKAGE_ERROR_CODE, "Backup package format is unknown");
  }
  return parsed as ConfigBackupEnvelope;
}
