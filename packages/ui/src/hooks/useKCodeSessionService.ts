import type { IKCodeSessionService } from "@kcode/services";
import { useServices } from "@/hooks/useServices.js";
import { useWorkspaceServices } from "@/hooks/useWorkspaceServices.js";

export function useKCodeSessionService(
  workspacePath?: string,
  preferredRemoteSessionId?: string | null,
  workspaceIdentity?: string | null,
): IKCodeSessionService {
  const services = workspacePath
    ? useWorkspaceServices(workspacePath, preferredRemoteSessionId, workspaceIdentity)
    : useServices();
  return services.kcodeSessionService;
}
