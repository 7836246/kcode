import { GITHUB_URL } from "./content.js";
import type { WebsiteLocale, websiteCopy } from "./content.js";
import { DOC_GROUPS } from "./docs/nav.js";
import { docNavCopy } from "./docs/pages.js";
import { KMark } from "./KMark.js";
import { GitHubGlyph, GlobeGlyph, MenuGlyph, MoonGlyph, SunGlyph } from "./platformIcons.js";
import { docsPath } from "./siteRoute.js";
import type { SiteTheme } from "./theme.js";

type HeaderCopy = (typeof websiteCopy)[WebsiteLocale];

export function SiteHeader(options: {
  copy: HeaderCopy;
  locale: WebsiteLocale;
  theme: SiteTheme;
  menuOpen: boolean;
  docsSlug: string | null;
  changelogActive: boolean;
  onToggleMenu: () => void;
  onToggleLocale: () => void;
  onToggleTheme: () => void;
  onNavigate: (href: string) => void;
}) {
  const { copy, locale, theme, menuOpen, docsSlug, changelogActive, onToggleMenu, onToggleLocale, onToggleTheme, onNavigate } =
    options;
  const onDocs = docsSlug !== null;
  const labels = docNavCopy[locale];

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 py-3 backdrop-blur transition-[background-color,border-color] duration-200">
      <nav className="mx-auto w-full max-w-7xl px-4">
        <div className="flex flex-col md:hidden">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-expanded={menuOpen}
              aria-label={copy.navMenu}
              className="flex size-9 items-center justify-center rounded-full border border-border text-foreground transition hover:bg-muted"
              onClick={onToggleMenu}
            >
              <MenuGlyph className="size-4" />
            </button>
            <div className="flex flex-1 justify-center">
              <Brand copy={copy} onNavigate={onNavigate} />
            </div>
            <div className="flex items-center gap-2">
              <SourceLink label={copy.navSource} />
              <ThemeButton copy={copy} theme={theme} onToggleTheme={onToggleTheme} compact />
            </div>
          </div>
          {menuOpen ? (
            <div className="mt-3 flex flex-col gap-2 pb-2 text-sm text-muted-foreground" id="mobile-nav">
              <HeaderLink href="/docs" label={copy.navDocs} active={onDocs} onNavigate={onNavigate} onDone={onToggleMenu} />
              <HeaderLink href="/changelog" label={copy.navChangelog} active={changelogActive} onNavigate={onNavigate} onDone={onToggleMenu} />
              <HeaderLink href="/#all-downloads" label={copy.navDownload} onNavigate={onNavigate} onDone={onToggleMenu} />
              <a
                className="inline-flex items-center gap-2 transition hover:text-foreground"
                href={GITHUB_URL}
                rel="noreferrer"
                target="_blank"
              >
                <GitHubGlyph className="size-4" />
                {copy.navSource}
              </a>
              <button className="text-left transition hover:text-foreground" type="button" onClick={onToggleLocale}>
                {copy.languageName}
              </button>
              {onDocs
                ? DOC_GROUPS.flatMap((group) => group.slugs).map((slug) => (
                    <HeaderLink
                      key={slug}
                      href={docsPath(slug)}
                      label={labels[slug]}
                      active={slug === docsSlug}
                      onNavigate={onNavigate}
                      onDone={onToggleMenu}
                    />
                  ))
                : null}
            </div>
          ) : null}
        </div>
        <div className="hidden items-center justify-between md:flex">
          <div className="flex w-42 justify-center md:justify-start">
            <Brand copy={copy} onNavigate={onNavigate} />
          </div>
          <div className="flex flex-1 items-center justify-start gap-8 px-6 text-sm text-muted-foreground">
            <HeaderLink href="/docs" label={copy.navDocs} active={onDocs} onNavigate={onNavigate} />
            <HeaderLink href="/changelog" label={copy.navChangelog} active={changelogActive} onNavigate={onNavigate} />
            <HeaderLink href="/#all-downloads" label={copy.navDownload} onNavigate={onNavigate} />
          </div>
          <div className="flex shrink-0 items-center justify-center gap-3 text-sm md:justify-end">
            <SourceLink label={copy.navSource} />
            <ThemeButton copy={copy} theme={theme} onToggleTheme={onToggleTheme} />
            <button
              type="button"
              className="inline-flex min-w-[84px] shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-border bg-muted px-3 py-1.5 pr-4 text-sm font-normal text-foreground transition hover:bg-muted/80"
              onClick={onToggleLocale}
            >
              <GlobeGlyph className="size-4 text-muted-foreground" />
              {copy.languageName}
            </button>
          </div>
        </div>
      </nav>
    </header>
  );
}

function Brand(options: { copy: HeaderCopy; onNavigate: (href: string) => void }) {
  const { copy, onNavigate } = options;
  return (
    <a
      className="relative flex items-center gap-2"
      href="/"
      onClick={(event) => {
        event.preventDefault();
        onNavigate("/");
      }}
    >
      <div className="relative flex size-9 items-center justify-center rounded-lg bg-[linear-gradient(180deg,#000000_0%,#151718_100%)] text-[#ffffff] shadow-xl/20 before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:border before:border-[rgba(255,255,255,0.2)] before:content-['']">
        <KMark className="h-auto w-5.5 shrink-0 text-current" />
      </div>
      <span className="h-[18px] text-[15px] font-bold tracking-[0.14em] text-foreground">{copy.brand}</span>
    </a>
  );
}

function HeaderLink(options: {
  href: string;
  label: string;
  active?: boolean;
  onNavigate: (href: string) => void;
  onDone?: () => void;
}) {
  const { href, label, active, onNavigate, onDone } = options;
  return (
    <a
      className={active ? "text-foreground transition" : "transition hover:text-foreground"}
      href={href}
      onClick={(event) => {
        event.preventDefault();
        onNavigate(href);
        onDone?.();
      }}
    >
      {label}
    </a>
  );
}

function SourceLink(options: { label: string }) {
  const { label } = options;
  return (
    <a
      aria-label={label}
      className="inline-flex size-9 items-center justify-center rounded-full border border-border bg-muted text-foreground transition hover:bg-muted/80"
      href={GITHUB_URL}
      rel="noreferrer"
      target="_blank"
      title={label}
    >
      <GitHubGlyph className="size-4" />
    </a>
  );
}

function ThemeButton(options: {
  copy: HeaderCopy;
  theme: SiteTheme;
  onToggleTheme: () => void;
  compact?: boolean;
}) {
  const { copy, theme, onToggleTheme, compact } = options;
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      aria-label={next === "light" ? copy.themeToLight : copy.themeToDark}
      className={
        compact
          ? "inline-flex size-9 items-center justify-center rounded-full border border-border bg-muted text-foreground transition hover:bg-muted/80"
          : "inline-flex size-9 items-center justify-center rounded-full border border-border bg-muted text-foreground transition hover:bg-muted/80"
      }
      onClick={onToggleTheme}
    >
      {theme === "dark" ? <SunGlyph className="size-4" /> : <MoonGlyph className="size-4" />}
    </button>
  );
}
