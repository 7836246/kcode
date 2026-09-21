import {
  detectDownloadTarget as detectDownloadTargetRaw,
  fetchGithubReleases as fetchGithubReleasesRaw,
  fetchLatestReleaseTag as fetchLatestReleaseTagRaw,
  latestReleaseTag as latestReleaseTagRaw,
  linuxFormatUrl as linuxFormatUrlRaw,
  resolveChangelog as resolveChangelogRaw,
  resolveReleaseDownloads as resolveReleaseDownloadsRaw,
} from "./releaseDownloads.mjs";
import type { ChangelogEntry, DownloadTargetId, ReleaseDownloads } from "./releaseTypes.js";

export type { ChangelogEntry };

export function resolveReleaseDownloads(tag: string | null): ReleaseDownloads {
  return resolveReleaseDownloadsRaw(tag) as ReleaseDownloads;
}

export function detectDownloadTarget(userAgent: string, platform?: string): DownloadTargetId {
  return detectDownloadTargetRaw(userAgent, platform) as DownloadTargetId;
}

export function linuxFormatUrl(
  downloads: ReleaseDownloads,
  arch: "linux-x64" | "linux-arm64",
  ext: "deb" | "rpm" | "AppImage",
): string {
  return linuxFormatUrlRaw(downloads, arch, ext);
}

export function fetchLatestReleaseTag(
  loadJson?: (url: string) => Promise<unknown>,
): Promise<string | null> {
  return fetchLatestReleaseTagRaw(loadJson);
}

export function fetchGithubReleases(loadJson?: (url: string) => Promise<unknown>): Promise<unknown[]> {
  return fetchGithubReleasesRaw(loadJson) as Promise<unknown[]>;
}

export function latestReleaseTag(releases: unknown): string | null {
  return latestReleaseTagRaw(releases) as string | null;
}

export function resolveChangelog(payload: unknown): ChangelogEntry[] {
  return resolveChangelogRaw(payload) as ChangelogEntry[];
}
