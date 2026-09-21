import { useEffect, useMemo, useState } from "react";
import { ChangelogPage } from "./ChangelogPage.js";
import { DocsPage } from "./DocsPage.js";
import { DownloadSection } from "./DownloadSection.js";
import { FeatureSection } from "./FeatureSection.js";
import { Hero } from "./Hero.js";
import { SiteFooter } from "./SiteFooter.js";
import { SiteHeader } from "./SiteHeader.js";
import { SITE_ORIGIN, type WebsiteLocale, websiteCopy } from "./content.js";
import { getDocPage } from "./docs/pages.js";
import { applyPageSeo, resolvePageSeo } from "./seo.js";
import {
  detectDownloadTarget,
  fetchGithubReleases,
  latestReleaseTag,
  resolveChangelog,
  resolveReleaseDownloads,
} from "./release.js";
import { docsPath, parseSitePath } from "./siteRoute.js";
import { applyTheme, persistTheme, readStoredTheme, resolveTheme, THEME_STORAGE_KEY, type SiteTheme } from "./theme.js";

function readInitialLocale(): WebsiteLocale {
  const param = new URLSearchParams(window.location.search).get("lang");
  if (param === "en" || param === "zh") {
    return param;
  }
  return navigator.language.toLowerCase().startsWith("zh") ? "zh" : "en";
}

function readInitialTheme(): SiteTheme {
  return resolveTheme(readStoredTheme(window.localStorage.getItem(THEME_STORAGE_KEY)));
}

export function App() {
  const [locale, setLocale] = useState<WebsiteLocale>(readInitialLocale);
  const [theme, setTheme] = useState<SiteTheme>(readInitialTheme);
  const [menuOpen, setMenuOpen] = useState(false);
  const [path, setPath] = useState(window.location.pathname);
  const [releases, setReleases] = useState<unknown[]>([]);
  const copy = websiteCopy[locale];
  const route = parseSitePath(path);
  const tag = latestReleaseTag(releases);
  const downloads = useMemo(() => resolveReleaseDownloads(tag), [tag]);
  const changelog = useMemo(() => resolveChangelog(releases), [releases]);
  const primaryTarget = useMemo(
    () => detectDownloadTarget(navigator.userAgent, navigator.platform),
    [],
  );
  const primaryHref = downloads.assets[primaryTarget] ?? downloads.latestPage;
  const primaryLabel =
    primaryTarget === "mac-x64"
      ? copy.macIntel
      : primaryTarget === "win-x64"
        ? copy.winX64
        : primaryTarget === "win-arm64"
          ? copy.winArm
          : primaryTarget === "linux-x64"
            ? copy.linuxX64
            : primaryTarget === "linux-arm64"
              ? copy.linuxArm
              : copy.macApple;

  useEffect(() => {
    document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
    const doc = route.page === "docs" ? getDocPage(route.slug, locale) : null;
    const path =
      route.page === "home" ? "/" : route.page === "changelog" ? "/changelog" : docsPath(route.slug);
    applyPageSeo(
      resolvePageSeo({
        page: route.page,
        path,
        origin: SITE_ORIGIN,
        seoTitle: copy.seoTitle,
        seoDescription: copy.seoDescription,
        seoKeywords: copy.seoKeywords,
        changelogTitle: copy.changelogTitle,
        changelogLead: copy.changelogLead,
        brand: copy.documentTitle,
        docTitle: doc?.title ?? null,
        docLead: doc?.lead ?? null,
      }),
      locale,
    );
  }, [copy, locale, route]);

  useEffect(() => {
    const next = new URL(window.location.href);
    next.searchParams.set("lang", locale);
    window.history.replaceState(null, "", next);
  }, [locale]);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetchGithubReleases().then((nextReleases) => {
      if (!cancelled) {
        setReleases(nextReleases);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function onNavigate(href: string) {
    const next = new URL(href, window.location.origin);
    next.search = window.location.search;
    window.history.pushState(null, "", next);
    setPath(next.pathname);
    setMenuOpen(false);
    if (next.hash) {
      window.requestAnimationFrame(() => {
        document.getElementById(next.hash.slice(1))?.scrollIntoView();
      });
      return;
    }
    window.scrollTo(0, 0);
  }

  return (
    <div className="min-h-screen bg-background text-foreground text-base">
      <SiteHeader
        copy={copy}
        locale={locale}
        theme={theme}
        menuOpen={menuOpen}
        docsSlug={route.page === "docs" ? route.slug : null}
        changelogActive={route.page === "changelog"}
        onToggleMenu={() => setMenuOpen((open) => !open)}
        onToggleLocale={() => setLocale((current) => (current === "zh" ? "en" : "zh"))}
        onToggleTheme={() => {
          const next = theme === "dark" ? "light" : "dark";
          persistTheme(next);
          setTheme(next);
        }}
        onNavigate={onNavigate}
      />
      <main>
        {route.page === "docs" ? (
          <DocsPage copy={copy} locale={locale} slug={route.slug} onNavigate={onNavigate} />
        ) : route.page === "changelog" ? (
          <ChangelogPage copy={copy} locale={locale} entries={changelog} />
        ) : (
          <>
            <Hero
              copy={copy}
              version={downloads.version}
              primaryHref={primaryHref}
              primaryLabel={primaryLabel}
              primaryTarget={primaryTarget}
            />
            <FeatureSection copy={copy} />
            <DownloadSection copy={copy} downloads={downloads} />
          </>
        )}
      </main>
      <SiteFooter copy={copy} />
    </div>
  );
}
