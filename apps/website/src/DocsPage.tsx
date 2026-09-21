import type { WebsiteLocale, websiteCopy } from "./content.js";
import { DOC_GROUPS, type DocSlug } from "./docs/nav.js";
import { docNavCopy, getDocPage, neighborSlugs } from "./docs/pages.js";
import { docsPath } from "./siteRoute.js";

type SiteCopy = (typeof websiteCopy)[WebsiteLocale];

export function DocsPage(options: {
  copy: SiteCopy;
  locale: WebsiteLocale;
  slug: string;
  onNavigate: (href: string) => void;
}) {
  const { copy, locale, slug, onNavigate } = options;
  const labels = docNavCopy[locale];
  const known = DOC_GROUPS.flatMap((group) => group.slugs).includes(slug as DocSlug);
  const page = known ? getDocPage(slug, locale) : null;
  const neighbors = known ? neighborSlugs(slug as DocSlug) : { prev: null, next: null };
  const prevSlug = neighbors.prev;
  const nextSlug = neighbors.next;

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-7xl gap-10 px-4 py-6 sm:px-6 lg:px-10">
      <aside className="sticky top-20 z-10 hidden w-64 shrink-0 flex-col gap-6 self-start py-2 text-sm text-muted-foreground xl:flex">
        {DOC_GROUPS.map((group) => (
          <div key={group.id}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-foreground">{labels[group.id]}</p>
            <ul className="flex flex-col gap-1">
              {group.slugs.map((item) => (
                <li key={item}>
                  <a
                    className={
                      item === slug
                        ? "block rounded-md bg-muted px-2 py-1.5 text-foreground"
                        : "block rounded-md px-2 py-1.5 transition hover:bg-muted hover:text-foreground"
                    }
                    href={docsPath(item)}
                    onClick={(event) => {
                      event.preventDefault();
                      onNavigate(docsPath(item));
                    }}
                  >
                    {labels[item]}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </aside>
      <article className="min-w-0 flex-1 pb-16">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">{copy.navDocs}</p>
        {page ? (
          <>
            <h1 className="mt-3 text-4xl font-semibold text-foreground">{page.title}</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">{page.lead}</p>
            {page.blocks.map((block, index) => (
              <DocBlockView block={block} key={`${block.type}-${index}`} />
            ))}
            <nav className="mt-32 grid gap-3 border-t border-border pt-20 sm:grid-cols-2">
              {prevSlug ? (
                <PagerLink
                  align="start"
                  description={getDocPage(prevSlug, locale)?.lead ?? ""}
                  href={docsPath(prevSlug)}
                  label={copy.docsPrev}
                  title={labels[prevSlug]}
                  onNavigate={onNavigate}
                />
              ) : (
                <span className="hidden sm:block" />
              )}
              {nextSlug ? (
                <PagerLink
                  align="end"
                  description={getDocPage(nextSlug, locale)?.lead ?? ""}
                  href={docsPath(nextSlug)}
                  label={copy.docsNext}
                  title={labels[nextSlug]}
                  onNavigate={onNavigate}
                />
              ) : null}
            </nav>
          </>
        ) : (
          <>
            <h1 className="mt-3 text-4xl font-semibold text-foreground">{copy.docsMissingTitle}</h1>
            <p className="mt-4 text-muted-foreground">{copy.docsMissingBody}</p>
          </>
        )}
      </article>
    </div>
  );
}

function PagerLink(options: {
  href: string;
  label: string;
  title: string;
  description: string;
  align: "start" | "end";
  onNavigate: (href: string) => void;
}) {
  const { href, label, title, description, align, onNavigate } = options;
  return (
    <a
      className={
        align === "end"
          ? "flex min-h-28 flex-col items-end justify-center gap-1 rounded-xl border border-border bg-muted/50 px-5 py-4 text-right transition hover:border-foreground/20 hover:bg-muted"
          : "flex min-h-28 flex-col items-start justify-center gap-1 rounded-xl border border-border bg-muted/50 px-5 py-4 text-left transition hover:border-foreground/20 hover:bg-muted"
      }
      href={href}
      onClick={(event) => {
        event.preventDefault();
        onNavigate(href);
      }}
    >
      <span className="text-xs font-medium text-muted-foreground">
        {align === "end" ? `${label} →` : `← ${label}`}
      </span>
      <span className="text-base font-semibold text-foreground">{title}</span>
      <span className="line-clamp-2 text-sm leading-6 text-muted-foreground">{description}</span>
    </a>
  );
}

function DocBlockView({ block }: { block: import("./docs/pages.js").DocBlock }) {
  if (block.type === "h2") {
    return <h2 className="mt-12 text-2xl font-semibold text-foreground">{block.text}</h2>;
  }
  if (block.type === "p") {
    return <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">{block.text}</p>;
  }
  if (block.type === "note") {
    return (
      <p className="mt-4 max-w-3xl rounded-lg border border-border bg-muted px-4 py-3 text-sm leading-6 text-foreground">
        {block.text}
      </p>
    );
  }
  if (block.type === "code") {
    return (
      <pre className="mt-4 max-w-3xl overflow-auto rounded-lg bg-muted p-4 text-sm text-foreground">
        <code>{block.text}</code>
      </pre>
    );
  }
  if (block.type === "ul") {
    return (
      <ul className="mt-4 max-w-3xl list-disc space-y-2 pl-5 text-muted-foreground">
        {block.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  }
  return (
    <ol className="mt-4 max-w-3xl list-decimal space-y-2 pl-5 text-muted-foreground">
      {block.items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ol>
  );
}
