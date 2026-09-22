import { KCODE_GITHUB_NEW_ISSUE_URL, type IPlatformService } from "@kcode/shared";

export function openKCodeGitHubIssue(platform: Pick<IPlatformService, "openExternal">): void {
  platform.openExternal(KCODE_GITHUB_NEW_ISSUE_URL);
}
