export const GITHUB_REPO = "7836246/kcode";
export const GITHUB_LATEST_RELEASE_URL = `https://github.com/${GITHUB_REPO}/releases/latest`;

const ASSET_FILES = {
  "mac-arm64": (version) => `KCode-${version}-mac-arm64.dmg`,
  "mac-x64": (version) => `KCode-${version}-mac-x64.dmg`,
  "win-x64": (version) => `KCode-${version}-win-x64.exe`,
  "win-arm64": (version) => `KCode-${version}-win-arm64.exe`,
  "linux-x64": (version) => `KCode-${version}-linux-x64.AppImage`,
  "linux-arm64": (version) => `KCode-${version}-linux-arm64.AppImage`,
};

export function stripReleaseTag(tag) {
  return tag.trim().replace(/^v/i, "");
}

export function assetDownloadUrl(tag, fileName) {
  return `https://github.com/${GITHUB_REPO}/releases/download/${tag}/${fileName}`;
}

export function resolveReleaseDownloads(tag) {
  const normalizedTag = tag?.trim() ? tag.trim() : null;
  const version = normalizedTag ? stripReleaseTag(normalizedTag) : null;
  const assets = {};
  for (const [id, fileName] of Object.entries(ASSET_FILES)) {
    assets[id] =
      normalizedTag && version
        ? assetDownloadUrl(normalizedTag, fileName(version))
        : GITHUB_LATEST_RELEASE_URL;
  }
  return {
    version,
    tag: normalizedTag,
    latestPage: GITHUB_LATEST_RELEASE_URL,
    assets,
  };
}

export function detectDownloadTarget(userAgent, platform = "", hints = {}) {
  const ua = userAgent.toLowerCase();
  const plat = platform.toLowerCase();
  const architecture = String(hints.architecture ?? "").toLowerCase();
  const isMac = plat.includes("mac") || ua.includes("mac os");
  const isWin = plat.includes("win") || ua.includes("windows");
  const isLinux = (plat.includes("linux") || ua.includes("linux")) && !ua.includes("android");
  // Mac 的 UA 几乎都写 Intel Mac OS X，Apple Silicon 也一样，不能当 x64 证据。
  const isArm =
    architecture.startsWith("arm") ||
    architecture === "aarch64" ||
    ua.includes("aarch64") ||
    ua.includes("arm64") ||
    /\barm\b/.test(ua);
  const isX86 = architecture === "x86" || architecture.startsWith("x86");

  if (isMac) {
    if (isArm) return "mac-arm64";
    if (isX86) return "mac-x64";
    return "mac-arm64";
  }
  if (isWin) {
    return isArm ? "win-arm64" : "win-x64";
  }
  if (isLinux) {
    return isArm ? "linux-arm64" : "linux-x64";
  }
  return "mac-arm64";
}

export function linuxFormatUrl(downloads, arch, ext) {
  if (!downloads.tag || !downloads.version) {
    return downloads.latestPage;
  }
  const archSuffix = arch === "linux-arm64" ? "arm64" : "x64";
  return assetDownloadUrl(downloads.tag, `KCode-${downloads.version}-linux-${archSuffix}.${ext}`);
}

export async function fetchLatestReleaseTag(loadJson = defaultLoadJson) {
  const releases = await fetchGithubReleases(loadJson);
  return latestReleaseTag(releases);
}

export async function fetchGithubReleases(loadJson = defaultLoadJson) {
  try {
    const payload = await loadJson(`https://api.github.com/repos/${GITHUB_REPO}/releases?per_page=20`);
    return Array.isArray(payload) ? payload : [];
  } catch {
    return [];
  }
}

export function latestReleaseTag(releases) {
  if (!Array.isArray(releases)) {
    return null;
  }
  const first = releases.find(
    (release) => release && release.draft !== true && typeof release.tag_name === "string" && release.tag_name.trim(),
  );
  return first ? first.tag_name.trim() : null;
}

/** @param {string} line */
function stripMd(line) {
  return line
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/^#+\s+/, "")
    .trim();
}

/** @param {string} body */
export function parseReleaseBody(body) {
  const text = String(body || "").replace(/\r\n/g, "\n").trim();
  if (!text) {
    return [];
  }
  const chunks = text.split(/^#{2,3}\s+/m);
  const sections = [];
  for (const chunk of chunks) {
    const trimmed = chunk.trim();
    if (!trimmed) {
      continue;
    }
    const lines = trimmed.split("\n");
    const first = lines[0] ?? "";
    const maybeTitle = stripMd(first);
    const hasExplicitHeading = chunks.length > 1 && Boolean(maybeTitle) && !/^[-*]/.test(first.trim());
    const title = hasExplicitHeading ? maybeTitle : null;
    const rest = hasExplicitHeading ? lines.slice(1) : lines;
    const items = [];
    const paragraphs = [];
    for (const line of rest) {
      const list = /^\s*[-*]\s+(.+)$/.exec(line);
      if (list) {
        items.push(stripMd(list[1]));
        continue;
      }
      const cleaned = stripMd(line);
      if (cleaned) {
        paragraphs.push(cleaned);
      }
    }
    if (title || items.length > 0 || paragraphs.length > 0) {
      sections.push({ title, items, paragraphs });
    }
  }
  return sections;
}

export function resolveChangelog(payload) {
  if (!Array.isArray(payload)) {
    return [];
  }
  return payload
    .filter(
      (release) =>
        release && release.draft !== true && typeof release.tag_name === "string" && release.tag_name.trim(),
    )
    .map((release) => {
      const tag = release.tag_name.trim();
      return {
        tag,
        version: stripReleaseTag(tag),
        name: typeof release.name === "string" && release.name.trim() ? release.name.trim() : tag,
        publishedAt: typeof release.published_at === "string" ? release.published_at : null,
        htmlUrl:
          typeof release.html_url === "string" && release.html_url
            ? release.html_url
            : `https://github.com/${GITHUB_REPO}/releases/tag/${encodeURIComponent(tag)}`,
        sections: parseReleaseBody(typeof release.body === "string" ? release.body : ""),
      };
    });
}

async function defaultLoadJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`release lookup failed: ${response.status}`);
  }
  return response.json();
}
