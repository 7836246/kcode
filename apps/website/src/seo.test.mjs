import assert from "node:assert/strict";
import test from "node:test";
import { resolvePageSeo } from "./seo.mjs";

const base = {
  origin: "https://kcode.wiki",
  seoTitle: "KCode | 开源 AI 编程工作台",
  seoDescription: "自行配置模型供应商。",
  seoKeywords: "KCode,AI编程",
  changelogTitle: "版本发布与更新",
  changelogLead: "各版本更新说明。",
  brand: "KCODE",
};

test("首页 TDK 用站点默认值", () => {
  const seo = resolvePageSeo({ ...base, page: "home", path: "/" });
  assert.equal(seo.title, base.seoTitle);
  assert.equal(seo.description, base.seoDescription);
  assert.equal(seo.keywords, base.seoKeywords);
  assert.equal(seo.canonical, "https://kcode.wiki/");
});

test("文档页用正文标题和导语", () => {
  const seo = resolvePageSeo({
    ...base,
    page: "docs",
    path: "/docs/install",
    docTitle: "安装",
    docLead: "从 GitHub Releases 下载。",
  });
  assert.equal(seo.title, "安装 · KCODE");
  assert.equal(seo.description, "从 GitHub Releases 下载。");
  assert.equal(seo.canonical, "https://kcode.wiki/docs/install");
});

test("更新日志用 changelog 文案", () => {
  const seo = resolvePageSeo({ ...base, page: "changelog", path: "/changelog" });
  assert.equal(seo.title, "版本发布与更新 · KCODE");
  assert.equal(seo.description, "各版本更新说明。");
});
