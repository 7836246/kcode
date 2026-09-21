import type { WebsiteLocale } from "../content.js";
import { DOC_GROUPS, type DocGroupId, type DocSlug } from "./nav.js";
import { enDocs } from "./enPages.js";
import type { DocPage } from "./types.js";
import { zhDocs } from "./zhPages.js";

export type { DocBlock, DocPage } from "./types.js";

export const docNavCopy: Record<WebsiteLocale, Record<DocGroupId | DocSlug, string>> = {
  zh: {
    start: "开始使用",
    core: "核心功能",
    help: "帮助",
    welcome: "欢迎使用 KCode",
    install: "安装",
    models: "连接模型",
    feedback: "用户反馈与支持",
    agent: "KCode Agent",
    goal: "目标模式",
    browser: "浏览器自动化",
    tasks: "任务与文件管理",
    remote: "Remote Control",
    plugins: "Plugin",
    skills: "Skill",
    "system-role": "系统角色",
    mcp: "MCP",
    shortcuts: "快捷键表",
    faq: "常见问题解答",
  },
  en: {
    start: "Get started",
    core: "Core",
    help: "Help",
    welcome: "Welcome to KCode",
    install: "Install",
    models: "Connect a model",
    feedback: "Feedback",
    agent: "KCode Agent",
    goal: "Goal mode",
    browser: "Browser automation",
    tasks: "Tasks and files",
    remote: "Remote control",
    plugins: "Plugin",
    skills: "Skill",
    "system-role": "System role",
    mcp: "MCP",
    shortcuts: "Shortcuts",
    faq: "FAQ",
  },
};

export function getDocPage(slug: string, locale: WebsiteLocale): DocPage | null {
  const pages = locale === "zh" ? zhDocs : enDocs;
  return slug in pages ? pages[slug as DocSlug] : null;
}

export function neighborSlugs(slug: DocSlug): { prev: DocSlug | null; next: DocSlug | null } {
  const all = DOC_GROUPS.flatMap((group) => group.slugs);
  const index = all.indexOf(slug);
  return {
    prev: index > 0 ? (all[index - 1] ?? null) : null,
    next: index >= 0 && index < all.length - 1 ? (all[index + 1] ?? null) : null,
  };
}
