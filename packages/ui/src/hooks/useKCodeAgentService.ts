import type { IKCodeAgentService } from "@kcode/services";
import { useServices } from "@/hooks/useServices.js";
import { useWorkspaceServices } from "@/hooks/useWorkspaceServices.js";

export function useKCodeAgentService(
  workspacePath?: string,
  preferredRemoteSessionId?: string | null,
  workspaceIdentity?: string | null,
): IKCodeAgentService {
  const services = workspacePath
    ? useWorkspaceServices(workspacePath, preferredRemoteSessionId, workspaceIdentity)
    : useServices();
  return services.kcodeAgentService;
}
