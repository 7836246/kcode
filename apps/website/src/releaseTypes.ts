export type DownloadTargetId =
  | "mac-arm64"
  | "mac-x64"
  | "win-x64"
  | "win-arm64"
  | "linux-x64"
  | "linux-arm64";

export type ReleaseDownloads = {
  version: string | null;
  tag: string | null;
  latestPage: string;
  assets: Record<DownloadTargetId, string>;
};

export type ChangelogSection = {
  title: string | null;
  items: string[];
  paragraphs: string[];
};

export type ChangelogEntry = {
  tag: string;
  version: string;
  name: string;
  publishedAt: string | null;
  htmlUrl: string;
  sections: ChangelogSection[];
};
