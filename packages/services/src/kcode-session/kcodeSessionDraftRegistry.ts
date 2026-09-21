import type { KCodeSessionStateSnapshot } from "@kcode/shared";
import type {
  KCodeSessionWorkspaceTarget,
  KCodeTaskTarget,
} from "#src/kcode-session/kcodeSession.js";

function getWorkspaceKey(target: KCodeSessionWorkspaceTarget): string {
  return target.workspaceIdentity?.trim() || target.workspacePath;
}

function getSessionScopedKey(target: KCodeTaskTarget): string {
  return `${getWorkspaceKey(target)}\0${target.sessionId}`;
}

export function createKCodeDeferredDraftRegistry() {
  const sessionKeys = new Set<string>();

  return {
    remember(params: KCodeSessionWorkspaceTarget, snapshot: KCodeSessionStateSnapshot): void {
      sessionKeys.add(
        getSessionScopedKey({
          workspacePath: snapshot.session.workspace.workspacePath,
          workspaceIdentity:
            snapshot.session.workspace.workspaceIdentity ?? params.workspaceIdentity,
          sessionId: snapshot.session.sessionId,
        }),
      );
    },

    has(target: KCodeTaskTarget): boolean {
      return sessionKeys.has(getSessionScopedKey(target));
    },

    forget(target: KCodeTaskTarget): void {
      sessionKeys.delete(getSessionScopedKey(target));
    },
  };
}
