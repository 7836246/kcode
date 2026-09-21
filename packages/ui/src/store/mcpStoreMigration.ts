import type { McpServerConfig, NativeMcpServerRecord } from "@kcode/shared";
import { logger } from "@/logger.js";
import {
  fetchNativeMcpServers,
  persistCliMcpToUserDirectory,
  type McpPlatformService,
  type MigrateLegacyResult,
} from "@/store/mcpStoreDesktop.js";
import {
  clearLegacyCommonMcpServers,
  readLegacyCommonMcpServers,
} from "@/store/mcpStoreHelpers.js";

interface CommonMcpMigrationResult extends MigrateLegacyResult {
  completed: boolean;
  changed: boolean;
}

function isKCodeAgentUserServer(server: NativeMcpServerRecord): boolean {
  return (
    server.source === "kcodeagentmcp" &&
    server.scope === "user" &&
    (!server.location || server.location.source === "kcode")
  );
}

export async function importLegacyCommonServersToKCodeAgent(
  platform: McpPlatformService | null,
  legacyServers: Record<string, McpServerConfig>,
  nativeServers: NativeMcpServerRecord[],
  sourcePath?: string,
): Promise<CommonMcpMigrationResult> {
  const entries = Object.entries(legacyServers);
  const totalCount = entries.length;
  if (totalCount === 0) {
    return {
      totalCount: 0,
      importedCount: 0,
      skippedCount: 0,
      sourcePath,
      completed: true,
      changed: false,
    };
  }

  const existingNames = new Set(
    nativeServers.filter(isKCodeAgentUserServer).map((server) => server.name),
  );
  let importedCount = 0;
  let skippedCount = 0;

  for (const [name, config] of entries) {
    if (existingNames.has(name)) {
      skippedCount += 1;
      continue;
    }

    try {
      const persisted = await persistCliMcpToUserDirectory(platform, {
        action: "upsert",
        source: "kcodeagentmcp",
        name,
        config,
      });
      if (!persisted) {
        return {
          totalCount,
          importedCount,
          skippedCount,
          sourcePath,
          completed: false,
          changed: importedCount > 0,
        };
      }
    } catch (error) {
      logger.warn(`[mcpStore] migrate legacy common MCP ${name} failed`, String(error));
      return {
        totalCount,
        importedCount,
        skippedCount,
        sourcePath,
        completed: false,
        changed: importedCount > 0,
      };
    }

    existingNames.add(name);
    importedCount += 1;
  }

  return {
    totalCount,
    importedCount,
    skippedCount,
    sourcePath,
    completed: true,
    changed: importedCount > 0,
  };
}

export async function migrateStoredCommonMcpToKCodeAgent(
  platform: McpPlatformService | null,
  nativeServers: NativeMcpServerRecord[],
  workspacePath?: string,
): Promise<NativeMcpServerRecord[]> {
  const legacyServers = readLegacyCommonMcpServers();
  if (Object.keys(legacyServers).length === 0) {
    return nativeServers;
  }

  // 旧通用 MCP 保存在 localStorage，不迁移就直接去掉 common 读取会让用户配置从设置页和运行时消失。
  const migration = await importLegacyCommonServersToKCodeAgent(
    platform,
    legacyServers,
    nativeServers,
    "localStorage:kcode-mcp-config",
  );
  if (migration.completed) {
    // 只有确认写入 kcode agent 目录后才清理旧数据，避免 Web 端没有 desktop bridge 时丢配置。
    clearLegacyCommonMcpServers();
  }
  if (!migration.changed) {
    return nativeServers;
  }

  logger.info(
    `[mcpStore] migrated ${migration.importedCount} legacy common MCP servers to kcode agent config`,
  );
  return fetchNativeMcpServers(platform, { workspacePath });
}
