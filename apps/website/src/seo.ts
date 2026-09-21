import { SITE_ORIGIN } from "./content.js";
import { resolvePageSeo as resolvePageSeoRaw } from "./seo.mjs";

export type PageSeo = {
  title: string;
  description: string;
  keywords: string;
  canonical: string;
  image: string;
};

export function resolvePageSeo(input: Parameters<typeof resolvePageSeoRaw>[0]): PageSeo {
  return resolvePageSeoRaw(input) as PageSeo;
}

function upsertMeta(selector: string, attributes: Record<string, string>): void {
  let node = document.head.querySelector(selector);
  if (!node) {
    node = document.createElement("meta");
    document.head.append(node);
  }
  for (const [key, value] of Object.entries(attributes)) {
    node.setAttribute(key, value);
  }
}

function upsertLink(rel: string, href: string, extra?: Record<string, string>): void {
  const extraKey = extra
    ? Object.entries(extra)
        .map(([key, value]) => `[${key}="${value}"]`)
        .join("")
    : "";
  const selector = extra ? `link[rel="${rel}"]${extraKey}` : `link[rel="${rel}"]:not([hreflang])`;
  let node = document.head.querySelector(selector);
  if (!node) {
    node = document.createElement("link");
    document.head.append(node);
  }
  node.setAttribute("rel", rel);
  node.setAttribute("href", href);
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      node.setAttribute(key, value);
    }
  }
}

export function applyPageSeo(seo: PageSeo, locale: "zh" | "en"): void {
  document.title = seo.title;
  upsertMeta('meta[name="description"]', { name: "description", content: seo.description });
  upsertMeta('meta[name="keywords"]', { name: "keywords", content: seo.keywords });
  upsertMeta('meta[name="robots"]', { name: "robots", content: "index,follow" });
  upsertMeta('meta[property="og:type"]', { property: "og:type", content: "website" });
  upsertMeta('meta[property="og:site_name"]', { property: "og:site_name", content: "KCode" });
  upsertMeta('meta[property="og:title"]', { property: "og:title", content: seo.title });
  upsertMeta('meta[property="og:description"]', { property: "og:description", content: seo.description });
  upsertMeta('meta[property="og:url"]', { property: "og:url", content: seo.canonical });
  upsertMeta('meta[property="og:image"]', { property: "og:image", content: seo.image });
  upsertMeta('meta[property="og:locale"]', { property: "og:locale", content: locale === "zh" ? "zh_CN" : "en_US" });
  upsertMeta('meta[name="twitter:card"]', { name: "twitter:card", content: "summary_large_image" });
  upsertMeta('meta[name="twitter:title"]', { name: "twitter:title", content: seo.title });
  upsertMeta('meta[name="twitter:description"]', { name: "twitter:description", content: seo.description });
  upsertLink("canonical", seo.canonical);
  upsertLink("alternate", `${SITE_ORIGIN}${new URL(seo.canonical).pathname}?lang=zh`, { hreflang: "zh-CN" });
  upsertLink("alternate", `${SITE_ORIGIN}${new URL(seo.canonical).pathname}?lang=en`, { hreflang: "en" });
  upsertLink("alternate", seo.canonical, { hreflang: "x-default" });
}
