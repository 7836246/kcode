const KCODE_GITHUB_RELEASE_OWNER = "7836246";
const KCODE_GITHUB_RELEASE_REPO = "kcode";

export const ELECTRON_UPDATE_MANIFEST_BY_OS = Object.freeze({
  mac: "latest-mac.yml",
  win: "latest.yml",
  linux: "latest-linux.yml",
});

export function resolveElectronUpdateManifestName(os, arch) {
  if (os === "linux" && arch && arch !== "x64") {
    // electron-builder / electron-updater 只给非 x64 的 Linux 加 arch 后缀。
    // arm64 客户端读 latest-linux-arm64.yml，不能用 latest-linux.yml 冒充。
    const suffix = arch === "armv7l" ? "arm" : arch;
    return `latest-linux-${suffix}.yml`;
  }

  return ELECTRON_UPDATE_MANIFEST_BY_OS[os];
}

export function parseReleaseTag(tag) {
  const trimmed = typeof tag === "string" ? tag.trim() : "";
  if (!/^v\d/.test(trimmed)) {
    throw new Error(`release tag must look like v0.0.1, got ${String(tag)}`);
  }

  const version = trimmed.slice(1);
  return {
    tag: trimmed,
    version,
    prerelease: version.includes("-"),
  };
}

export function resolveDesktopUpdateFeed(options) {
  const allowPrerelease = options.receivePreviewUpdates === true;
  const overrideUrl = options.overrideUrl?.trim();
  if (overrideUrl && options.isPackaged !== true) {
    return {
      provider: "generic",
      url: overrideUrl,
      allowPrerelease,
    };
  }

  return {
    provider: "github",
    owner: KCODE_GITHUB_RELEASE_OWNER,
    repo: KCODE_GITHUB_RELEASE_REPO,
    allowPrerelease,
  };
}

export function buildElectronBuilderPublish() {
  return {
    provider: "github",
    owner: KCODE_GITHUB_RELEASE_OWNER,
    repo: KCODE_GITHUB_RELEASE_REPO,
    releaseType: "release",
    vPrefixedTagName: true,
  };
}

export function toElectronUpdaterFeedURL(feed) {
  if (feed.provider === "generic") {
    return {
      provider: "generic",
      url: feed.url,
    };
  }

  return {
    provider: "github",
    owner: feed.owner,
    repo: feed.repo,
  };
}
