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
            <nav className="mt-14 flex justify-between gap-4 border-t border-border pt-6 text-sm">
              {neighbors.prev ? (
                <a
                  className="text-muted-foreground transition hover:text-foreground"
                  href={docsPath(neighbors.prev)}
                  onClick={(event) => {
                    event.preventDefault();
                    onNavigate(docsPath(neighbors.prev!));
                  }}
                >
                  ← {labels[neighbors.prev]}
                </a>
              ) : (
                <span />
              )}
              {neighbors.next ? (
                <a
                  className="text-muted-foreground transition hover:text-foreground"
                  href={docsPath(neighbors.next)}
                  onClick={(event) => {
                    event.preventDefault();
                    onNavigate(docsPath(neighbors.next!));
                  }}
                >
                  {labels[neighbors.next]} →
                </a>
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

function DocBlockView({ block }: { block: import("./docs/pages.js").DocBlock }) {
  if (block.type === "h2") {
    return <h2 className="mt-10 text-2xl font-semibold text-foreground">{block.text}</h2>;
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
