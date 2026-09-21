import type { WebsiteLocale, websiteCopy } from "./content.js";
import { GITHUB_RELEASES_URL } from "./content.js";
import type { ChangelogEntry } from "./release.js";

type SiteCopy = (typeof websiteCopy)[WebsiteLocale];

export function ChangelogPage(options: {
  copy: SiteCopy;
  locale: WebsiteLocale;
  entries: ChangelogEntry[];
}) {
  const { copy, locale, entries } = options;
  const dateLocale = locale === "zh" ? "zh-CN" : "en-US";

  return (
    <article className="mx-auto min-h-[calc(100vh-8rem)] w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-10">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">{copy.navChangelog}</p>
      <h1 className="mt-3 text-4xl font-semibold text-foreground">{copy.changelogTitle}</h1>
      <p className="mt-4 text-base leading-7 text-muted-foreground">{copy.changelogLead}</p>
      {entries.length === 0 ? (
        <p className="mt-10 text-muted-foreground">
          {copy.changelogEmpty}{" "}
          <a className="underline underline-offset-4 hover:text-foreground" href={GITHUB_RELEASES_URL} rel="noreferrer" target="_blank">
            {copy.changelogGithub}
          </a>
        </p>
      ) : (
        <div className="mt-10 flex flex-col gap-12">
          {entries.map((entry) => (
            <section className="border-t border-border pt-8" key={entry.tag}>
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="text-2xl font-semibold text-foreground">
                  {copy.changelogRelease} {entry.name.startsWith("v") || entry.name.startsWith("V") ? entry.name : `v${entry.version}`}
                </h2>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  {entry.publishedAt ? (
                    <time dateTime={entry.publishedAt}>
                      {new Date(entry.publishedAt).toLocaleDateString(dateLocale, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </time>
                  ) : null}
                  <a className="underline underline-offset-4 hover:text-foreground" href={entry.htmlUrl} rel="noreferrer" target="_blank">
                    {copy.changelogGithub}
                  </a>
                </div>
              </div>
              {entry.sections.length === 0 ? (
                <p className="mt-4 text-muted-foreground">{copy.changelogEmpty}</p>
              ) : (
                entry.sections.map((section, index) => (
                  <div key={`${entry.tag}-${section.title ?? "body"}-${index}`}>
                    {section.title ? <h3 className="mt-6 text-lg font-semibold text-foreground">{section.title}</h3> : null}
                    {section.paragraphs.map((paragraph) => (
                      <p className="mt-3 text-base leading-7 text-muted-foreground" key={paragraph}>
                        {paragraph}
                      </p>
                    ))}
                    {section.items.length > 0 ? (
                      <ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground">
                        {section.items.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ))
              )}
            </section>
          ))}
          <p className="text-sm text-muted-foreground">{copy.changelogEnd}</p>
        </div>
      )}
    </article>
  );
}
