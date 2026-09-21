/** @param {string} pathname */
export function parseSitePath(pathname) {
  const clean = pathname.replace(/\/+$/, "") || "/";
  if (clean === "/") {
    return { page: "home" };
  }
  if (clean === "/docs") {
    return { page: "docs", slug: "welcome" };
  }
  if (clean === "/changelog") {
    return { page: "changelog" };
  }
  const match = /^\/docs\/([a-z0-9-]+)$/.exec(clean);
  if (match) {
    return { page: "docs", slug: match[1] };
  }
  return { page: "home" };
}

/** @param {string} slug */
export function docsPath(slug) {
  return slug === "welcome" ? "/docs" : `/docs/${slug}`;
}
