import {
  CONFIG_BACKUP_DEFAULT_FILENAME,
  CONFIG_BACKUP_WEBDAV_ERROR_CODE,
  CONFIG_BACKUP_WEBDAV_EXISTS_ERROR_CODE,
  type ConfigBackupWebdavConnection,
} from "@kcode/shared";

export type ConfigBackupFetch = (
  url: string,
  init: {
    method: string;
    headers?: Record<string, string>;
    body?: Uint8Array | string;
  },
) => Promise<{ status: number; ok: boolean; body: Uint8Array }>;

function codedError(code: string, message: string): Error & { code: string } {
  return Object.assign(new Error(message), { code });
}

function basicAuthHeader(username: string, password: string): string {
  return `Basic ${Buffer.from(`${username}:${password}`, "utf8").toString("base64")}`;
}

export function resolveWebdavTargetUrl(connection: ConfigBackupWebdavConnection): string {
  const trimmed = connection.url.trim();
  if (!trimmed) {
    throw codedError(CONFIG_BACKUP_WEBDAV_ERROR_CODE, "WebDAV URL is required");
  }
  const remotePath = (connection.remotePath?.trim() || CONFIG_BACKUP_DEFAULT_FILENAME).replace(
    /^\/+/u,
    "",
  );
  if (trimmed.endsWith("/")) {
    return `${trimmed}${remotePath}`;
  }
  const lastSegment = trimmed.split("/").pop() ?? "";
  if (lastSegment.includes(".")) {
    return trimmed;
  }
  return `${trimmed}/${remotePath}`;
}

export function createConfigBackupWebdavClient(fetchImpl: ConfigBackupFetch) {
  const request = async (
    connection: ConfigBackupWebdavConnection,
    method: string,
    body?: Uint8Array,
  ) => {
    const url = resolveWebdavTargetUrl(connection);
    const headers: Record<string, string> = {
      Authorization: basicAuthHeader(connection.username, connection.password),
    };
    if (body) {
      headers["Content-Type"] = "application/octet-stream";
    }
    try {
      return { url, response: await fetchImpl(url, { method, headers, body }) };
    } catch (error) {
      throw codedError(
        CONFIG_BACKUP_WEBDAV_ERROR_CODE,
        error instanceof Error ? error.message : String(error),
      );
    }
  };

  return {
    async test(connection: ConfigBackupWebdavConnection): Promise<{ ok: boolean; error?: string }> {
      try {
        const { response } = await request(connection, "HEAD");
        if (response.status === 404 || response.ok || response.status === 405) {
          return { ok: true };
        }
        return { ok: false, error: `HTTP ${response.status}` };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },

    async upload(
      connection: ConfigBackupWebdavConnection,
      bytes: Uint8Array,
      overwrite: boolean,
    ): Promise<string> {
      if (!overwrite) {
        const existing = await request(connection, "HEAD");
        if (existing.response.ok) {
          throw codedError(
            CONFIG_BACKUP_WEBDAV_EXISTS_ERROR_CODE,
            "A backup already exists at this WebDAV path",
          );
        }
      }
      const { url, response } = await request(connection, "PUT", bytes);
      if (!response.ok && response.status !== 201 && response.status !== 204) {
        throw codedError(CONFIG_BACKUP_WEBDAV_ERROR_CODE, `WebDAV upload failed: HTTP ${response.status}`);
      }
      return url;
    },

    async download(connection: ConfigBackupWebdavConnection): Promise<Uint8Array> {
      const { response } = await request(connection, "GET");
      if (!response.ok) {
        throw codedError(
          CONFIG_BACKUP_WEBDAV_ERROR_CODE,
          `WebDAV download failed: HTTP ${response.status}`,
        );
      }
      return response.body;
    },
  };
}
