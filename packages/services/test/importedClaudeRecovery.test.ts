import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import {
  ZCODE_PROTOCOL_NAME,
  ZCODE_PROTOCOL_VERSION,
  zcodeSessionStateSnapshotSchema,
  type ZCodeSessionStateSnapshot,
} from "@zcode/shared";
import { getLegacyTaskSessionSnapshotPath, setDataBaseDir } from "../src/paths.js";
import { parseLegacyTaskSessionFile } from "../src/session/legacyTaskSessionFile.js";
import { TaskIndexRepo } from "../src/session/taskIndexRepo.js";
import { createZCodeTaskServiceAdapter } from "../src/zcode-agent/zcodeTaskServiceAdapter.js";

for (const clientMode of ["desktop-continuous", "web-remote-replayable"] as const) {
  test(`previously imported Claude history becomes a real session for ${clientMode}`, async () => {
    const dir = await mkdtemp(join(tmpdir(), "zcode-import-recovery-"));
    setDataBaseDir(dir);
    const meta = {
      taskId: "claude-import-example",
      traceId: "import-trace-example",
      workspacePath: "/example/workspace",
      workspaceIdentity: "example-remote-workspace",
      title: "Imported example",
      mode: "build" as const,
      provider: "glm" as const,
      migrationSource: "claudeCode" as const,
      createdAt: 1,
      updatedAt: 2,
    };
    const legacy = parseLegacyTaskSessionFile({
      meta,
      messages: [
        { id: "old-user", role: "user", content: "Example question", timestamp: 1 },
        { id: "old-assistant", role: "assistant", content: "Example answer", timestamp: 2 },
      ],
      toolCalls: [],
    });
    const path = getLegacyTaskSessionSnapshotPath(
      meta.workspacePath,
      meta.taskId,
      meta.workspaceIdentity,
    );
    const content = JSON.stringify(legacy);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content);
    const taskIndexRepo = new TaskIndexRepo(join(dir, "tasks.sqlite"));
    await taskIndexRepo.syncTaskMeta({ meta });
    type Options = Parameters<typeof createZCodeTaskServiceAdapter>[0];
    type CreateInput = Parameters<Options["zcodeAgentService"]["createSession"]>[0];
    const created: CreateInput[] = [];
    let session: ZCodeSessionStateSnapshot | undefined;
    const disposable = () => ({ dispose() {} });
    const service = createZCodeTaskServiceAdapter({
      taskIndexRepo,
      zcodeAgentService: {
        async resumeSession() {
          if (!session) throw new Error(`Session not found: ${meta.taskId}`);
          return session;
        },
        async createSession(input: CreateInput) {
          created.push(input);
          session = zcodeSessionStateSnapshotSchema.parse({
            protocol: { name: ZCODE_PROTOCOL_NAME, version: ZCODE_PROTOCOL_VERSION },
            session: {
              sessionId: input.sessionId,
              workspace: {
                workspacePath: meta.workspacePath,
                workspaceIdentity: meta.workspaceIdentity,
                workspaceKey: meta.workspaceIdentity,
              },
              sessionKind: "interactive",
              title: input.importedHistory?.title,
              mode: "build",
              status: "idle",
              createdAt: 1,
              updatedAt: 2,
            },
            settings: {
              model: { available: [] },
              thoughtLevel: { enabled: false, available: [] },
              mode: { current: "build" },
            },
            projection: {
              sessionId: input.sessionId,
              status: "idle",
              mode: "build",
              turnCount: 0,
              totalTokenCount: 0,
              contextUsed: 0,
              contextWindow: 200000,
              pendingPermissions: [],
              activeToolCalls: [],
              backgroundJobs: [],
            },
            runtime: { eventSeq: 0, stateRevision: 0, pendingRequestIds: [] },
            messages: [],
          });
          return session;
        },
        disposeAll() {},
      } as unknown as Options["zcodeAgentService"],
      taskIndexSyncer: {
        onSessionTerminalEvent: disposable,
        onSessionReadyEvent: disposable,
        disposeAll() {},
      } as unknown as Options["taskIndexSyncer"],
    });
    try {
      const snapshot = await service.getTaskSnapshot({ ...meta, clientMode });
      assert.equal(snapshot?.meta.taskId, meta.taskId);
      assert.equal(snapshot?.meta.migrationSource, "claudeCode");
      assert.equal(created.length, 1);
      assert.equal(created[0]?.workspaceIdentity, meta.workspaceIdentity);
      assert.equal(created[0]?.sessionId, meta.taskId);
      assert.equal(created[0]?.persistence, "immediate");
      assert.deepEqual(created[0]?.importedHistory, {
        source: "claudeCode",
        title: meta.title,
        createdAt: 1,
        updatedAt: 2,
        messages: legacy.messages.map(({ role, content, timestamp }) => ({
          role,
          content,
          timestamp,
        })),
      });
      assert.equal(await readFile(path, "utf8"), content);
    } finally {
      service.disposeAll();
      taskIndexRepo.close();
      setDataBaseDir(null);
      await rm(dir, { recursive: true, force: true });
    }
  });
}
