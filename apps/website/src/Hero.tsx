import type { WebsiteLocale, websiteCopy } from "./content.js";
import { HeroMock } from "./HeroMock.js";
import { AppleGlyph, LinuxGlyph, WindowsGlyph } from "./platformIcons.js";
import type { DownloadTargetId } from "./releaseTypes.js";

type HeroCopy = (typeof websiteCopy)[WebsiteLocale];

export function Hero(options: {
  copy: HeroCopy;
  version: string | null;
  primaryHref: string;
  primaryLabel: string;
  primaryTarget: DownloadTargetId;
}) {
  const { copy, version, primaryHref, primaryLabel, primaryTarget } = options;
  const Icon =
    primaryTarget.startsWith("win") ? WindowsGlyph : primaryTarget.startsWith("linux") ? LinuxGlyph : AppleGlyph;

  return (
    <section className="overflow-hidden pt-20 pb-18 text-left sm:px-6 sm:pt-22 sm:pb-24 lg:px-10" id="top">
      <div className="mx-auto flex max-w-7xl flex-1 flex-col items-center justify-center space-y-9 px-4 sm:space-y-12">
        <p className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-1.5 text-sm font-medium text-foreground shadow-md/20 backdrop-blur">
          {copy.banner}
        </p>
        <div className="flex flex-col items-center gap-4 text-center">
          <h1 className="text-4xl font-bold leading-tight sm:text-6xl lg:text-6xl">{copy.headline}</h1>
          <p className="text-md max-w-5xl text-muted-foreground sm:text-md">{copy.subtitle}</p>
        </div>
        <div className="flex w-full flex-col items-center justify-center gap-3">
          <a
            className="site-cta group flex items-center gap-5 rounded-2xl border px-6 py-4 text-left text-sm transition duration-300 ease-in-out"
            href={primaryHref}
          >
            <Icon className="size-8 shrink-0" />
            <div className="min-w-0">
              <p className="font-semibold">{copy.download}</p>
              <p className="site-cta-sub text-xs">
                {primaryLabel}
                {version ? `  v${version}` : ""}
              </p>
            </div>
          </a>
          <a
            className="text-xs text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
            href="#all-downloads"
          >
            {copy.viewAllDownloads}
          </a>
        </div>
        <HeroMock />
      </div>
    </section>
  );
}
