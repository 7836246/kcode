import type { WebsiteLocale, websiteCopy } from "./content.js";
import { AppleGlyph, LinuxGlyph, WindowsGlyph } from "./platformIcons.js";
import { linuxFormatUrl } from "./release.js";
import type { ReleaseDownloads } from "./releaseTypes.js";

type DownloadCopy = (typeof websiteCopy)[WebsiteLocale];

export function DownloadSection(options: { copy: DownloadCopy; downloads: ReleaseDownloads }) {
  const { copy, downloads } = options;
  const versionLabel = downloads.version ? `v${downloads.version}` : "";

  return (
    <section className="mx-auto mb-20 flex max-w-7xl flex-col gap-8 px-4 sm:px-6 lg:px-10" id="all-downloads">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">{copy.downloadsTitle}</h2>
        <p className="text-sm text-muted-foreground sm:text-base">{copy.downloadsLead}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3 md:gap-6">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 py-4">
            <AppleGlyph className="size-6 text-foreground" />
            <h3 className="text-lg font-semibold text-foreground">{copy.mac}</h3>
          </div>
          <div className="flex flex-col gap-2">
            <DownloadRow
              href={downloads.assets["mac-arm64"]}
              label={copy.macApple}
              ext={copy.extDmg}
              version={versionLabel}
            />
            <DownloadRow
              href={downloads.assets["mac-x64"]}
              label={copy.macIntel}
              ext={copy.extDmg}
              version={versionLabel}
            />
          </div>
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2 py-4">
            <WindowsGlyph className="size-6 text-foreground" />
            <h3 className="text-lg font-semibold text-foreground">{copy.windows}</h3>
          </div>
          <div className="flex flex-col gap-2">
            <DownloadRow
              href={downloads.assets["win-x64"]}
              label={copy.winX64}
              ext={copy.extExe}
              version={versionLabel}
            />
            <DownloadRow
              href={downloads.assets["win-arm64"]}
              label={copy.winArm}
              ext={copy.extExe}
              version={versionLabel}
            />
          </div>
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2 py-4">
            <LinuxGlyph className="size-6 text-foreground" />
            <h3 className="text-lg font-semibold text-foreground">{copy.linux}</h3>
            <span className="rounded-full border border-sky-400/50 bg-sky-400/10 px-2 py-0.5 text-xs font-medium text-sky-400">
              {copy.linuxBeta}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <LinuxRow downloads={downloads} arch="linux-x64" title={copy.linuxX64} />
            <LinuxRow downloads={downloads} arch="linux-arm64" title={copy.linuxArm} />
          </div>
        </div>
      </div>
    </section>
  );
}

function DownloadRow(options: { href: string; label: string; ext: string; version: string }) {
  const { href, label, ext, version } = options;
  return (
    <a
      className="flex items-center gap-5 rounded-lg bg-muted px-5 py-4 transition-colors hover:bg-muted/80"
      href={href}
    >
      <div className="flex flex-1 items-center gap-2">
        <span className="text-sm text-foreground">{label}</span>
        <span className="rounded bg-background px-1.5 py-0.5 text-xs text-muted-foreground">{ext}</span>
      </div>
      <span className="text-xs text-muted-foreground">{version}</span>
    </a>
  );
}

function LinuxRow(options: {
  downloads: ReleaseDownloads;
  arch: "linux-x64" | "linux-arm64";
  title: string;
}) {
  const { downloads, arch, title } = options;
  return (
    <div className="rounded-lg bg-muted px-3 py-3">
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-sm font-medium text-foreground">{title}</span>
        <span className="text-xs text-muted-foreground">{downloads.version ? `v${downloads.version}` : ""}</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <a
          className="flex min-h-10 items-center justify-center rounded-md bg-background px-2 text-xs text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
          href={linuxFormatUrl(downloads, arch, "deb")}
        >
          .deb
        </a>
        <a
          className="flex min-h-10 items-center justify-center rounded-md bg-background px-2 text-xs text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
          href={linuxFormatUrl(downloads, arch, "rpm")}
        >
          .rpm
        </a>
        <a
          className="flex min-h-10 items-center justify-center rounded-md bg-background px-2 text-xs text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
          href={downloads.assets[arch]}
        >
          .AppImage
        </a>
      </div>
    </div>
  );
}
