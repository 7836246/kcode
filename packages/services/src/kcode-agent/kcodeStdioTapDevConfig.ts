import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { KCodeStdioTapDevState } from "@kcode/shared";
import { getAppConfigDir } from "#src/paths.js";
import { isEffectiveDevelopmentNodeEnv } from "#src/runtime-tools/nodeEnv.js";

interface KCodeStdioTapStateFile {
  enabled?: boolean;
}

function isKCodeStdioTapDevVisible(): boolean {
  return isEffectiveDevelopmentNodeEnv();
}

function getKCodeStdioTapDevDir(): string {
  return join(getAppConfigDir(), "dev");
}

export function getKCodeStdioTapDevLogDir(): string {
  return join(getKCodeStdioTapDevDir(), "stdio-traffic");
}

function getKCodeStdioTapDevStatePath(): string {
  return join(getKCodeStdioTapDevDir(), "kcode-stdio-tap.json");
}

function readStateFile(path: string): KCodeStdioTapStateFile {
  if (!existsSync(path)) {
    return {};
  }

  try {
    const parsed = JSON.parse(readFileSync(path, "utf-8")) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as KCodeStdioTapStateFile) : {};
  } catch {
    return {};
  }
}

export function readKCodeStdioTapDevState(): KCodeStdioTapDevState {
  const visible = isKCodeStdioTapDevVisible();
  const statePath = getKCodeStdioTapDevStatePath();
  const fileState = readStateFile(statePath);
  return {
    enabled: visible && fileState.enabled === true,
    visible,
    logDir: getKCodeStdioTapDevLogDir(),
    statePath,
  };
}

export function setKCodeStdioTapDevEnabled(enabled: boolean): KCodeStdioTapDevState {
  const visible = isKCodeStdioTapDevVisible();
  const statePath = getKCodeStdioTapDevStatePath();
  mkdirSync(getKCodeStdioTapDevDir(), { recursive: true });
  writeFileSync(
    statePath,
    `${JSON.stringify(
      {
        // 开发态 stdio 抓包是高频原始协议帧，只能通过显式开关写旁路文件，避免误进生产日志。
        enabled: visible && enabled,
        updatedAt: new Date().toISOString(),
      },
      null,
      2,
    )}\n`,
  );
  return readKCodeStdioTapDevState();
}
