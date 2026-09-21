import { docsPath as docsPathRaw, parseSitePath as parseSitePathRaw } from "./siteRoute.mjs";

export type SiteRoute = { page: "home" } | { page: "docs"; slug: string } | { page: "changelog" };

export function parseSitePath(pathname: string): SiteRoute {
  return parseSitePathRaw(pathname) as SiteRoute;
}

export function docsPath(slug: string): string {
  return docsPathRaw(slug);
}
