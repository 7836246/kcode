import { GITHUB_URL, UPSTREAM_URL } from "./content.js";
import type { WebsiteLocale, websiteCopy } from "./content.js";

type FooterCopy = (typeof websiteCopy)[WebsiteLocale];

export function SiteFooter({ copy }: { copy: FooterCopy }) {
  return (
    <footer className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-10 text-sm text-muted-foreground sm:px-6 lg:px-10">
      <hr className="border-border" />
      <div className="flex flex-col items-center justify-between gap-4 text-center md:flex-row md:items-center md:text-left">
        <div className="flex flex-col items-center justify-center gap-y-1 sm:flex-row sm:flex-wrap sm:gap-x-3 md:justify-start">
          <p>{copy.footerCopy}</p>
          <span aria-hidden="true" className="hidden text-muted-foreground/40 sm:inline">
            ·
          </span>
          <p>{copy.footerLicense}</p>
          <span aria-hidden="true" className="hidden text-muted-foreground/40 sm:inline">
            ·
          </span>
          <p>{copy.footerDisclaimer}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-4 text-xs text-muted-foreground/50 md:justify-end">
          <a className="hover:text-foreground" href={GITHUB_URL} rel="noreferrer" target="_blank">
            {copy.footerSource}
          </a>
          <a className="hover:text-foreground" href={UPSTREAM_URL} rel="noreferrer" target="_blank">
            {copy.footerUpstream}
          </a>
          <a className="hover:text-foreground" href={`${GITHUB_URL}/blob/main/NOTICE.md`} rel="noreferrer" target="_blank">
            {copy.footerNotice}
          </a>
        </div>
      </div>
    </footer>
  );
}
