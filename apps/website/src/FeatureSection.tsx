import type { WebsiteLocale, websiteCopy } from "./content.js";

type FeatureCopy = (typeof websiteCopy)[WebsiteLocale];

export function FeatureSection({ copy }: { copy: FeatureCopy }) {
  return (
    <section className="mx-auto mb-20 flex max-w-7xl flex-col gap-10 px-4 py-8 sm:px-6 lg:px-10" id="features">
      <div className="flex flex-col gap-3">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">{copy.featuresEyebrow}</p>
        <h2 className="text-4xl font-semibold text-foreground">{copy.featuresTitle}</h2>
        <p className="max-w-3xl text-base text-muted-foreground">{copy.featuresLead}</p>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {copy.features.map((feature) => (
          <article
            className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card text-left shadow-[0_20px_60px_rgba(0,0,0,0.12)]"
            key={feature.title}
          >
            <div className="feature-visual">
              <img
                alt={feature.title}
                className="h-auto w-full object-cover"
                height={284}
                src={feature.image}
                width={379}
              />
            </div>
            <div className="flex flex-1 flex-col gap-2 p-6">
              <h3 className="text-lg font-semibold text-foreground">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.body}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
