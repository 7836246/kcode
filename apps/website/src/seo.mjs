export const SEO_OG_IMAGE_PATH = "/images/img-goal@2x.png";

/**
 * @param {{
 *   page: "home" | "docs" | "changelog"
 *   slug?: string
 *   path: string
 *   origin: string
 *   seoTitle: string
 *   seoDescription: string
 *   seoKeywords: string
 *   changelogTitle: string
 *   changelogLead: string
 *   brand: string
 *   docTitle?: string | null
 *   docLead?: string | null
 * }} input
 */
export function resolvePageSeo(input) {
  const path = input.path.startsWith("/") ? input.path : `/${input.path}`;
  const canonical = `${input.origin.replace(/\/+$/, "")}${path === "/" ? "/" : path}`;
  if (input.page === "docs") {
    const title = input.docTitle ? `${input.docTitle} · ${input.brand}` : input.seoTitle;
    return {
      title,
      description: input.docLead || input.seoDescription,
      keywords: input.seoKeywords,
      canonical,
      image: `${input.origin.replace(/\/+$/, "")}${SEO_OG_IMAGE_PATH}`,
    };
  }
  if (input.page === "changelog") {
    return {
      title: `${input.changelogTitle} · ${input.brand}`,
      description: input.changelogLead,
      keywords: input.seoKeywords,
      canonical,
      image: `${input.origin.replace(/\/+$/, "")}${SEO_OG_IMAGE_PATH}`,
    };
  }
  return {
    title: input.seoTitle,
    description: input.seoDescription,
    keywords: input.seoKeywords,
    canonical,
    image: `${input.origin.replace(/\/+$/, "")}${SEO_OG_IMAGE_PATH}`,
  };
}
