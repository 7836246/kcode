import type { WebsiteLocale } from "../content.js";
import { DOC_GROUPS, type DocGroupId, type DocSlug } from "./nav.js";

export type DocBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "code"; text: string }
  | { type: "note"; text: string };

export type DocPage = {
  title: string;
  lead: string;
  blocks: DocBlock[];
};

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

const zh: Record<DocSlug, DocPage> = {
  welcome: {
    title: "欢迎使用 KCode",
    lead: "KCode 是开源 AI 编程工作台。源码来自上游 ZCode，去掉了智谱 / Z.ai 登录和套餐，只保留你可以自己接上的桌面、浏览器和终端 Agent。",
    blocks: [
      { type: "p", text: "用自然语言做编码、调试、测试和变更审查。长任务可以在同一个会话里规划、执行、验证，不必反复补充背景。" },
      { type: "h2", text: "和上游的差别" },
      {
        type: "ul",
        items: [
          "不提供官方账号登录、OAuth 或 Coding Plan。",
          "安装包只从 GitHub Releases 提供。",
          "插件走仓库内置目录，不拉官方 CDN。",
          "设置里可以开关并编辑自定义系统角色。",
        ],
      },
      { type: "h2", text: "下一步" },
      { type: "ul", items: ["先安装桌面端或从源码启动。", "在设置里接入你自己的模型供应商。", "打开一个工作区，让 Agent 列出当前目录确认连通。", "版本变化看官网「更新日志」，条目来自 GitHub Releases。"] },
      { type: "note", text: "本项目仅供学习参考，不保证可用性与安全性，也不提供官方服务。" },
    ],
  },
  install: {
    title: "安装",
    lead: "从 GitHub Releases 下载桌面安装包，或用仓库里的开发命令从源码启动。",
    blocks: [
      { type: "p", text: "支持 macOS（Apple Silicon / Intel）、Windows（x64 / ARM64）、Linux（x64 / ARM64，AppImage、deb、rpm）。" },
      { type: "h2", text: "macOS" },
      {
        type: "ol",
        items: ["打开下载的 KCode.dmg。", "把 KCode.app 拖进 Applications。", "从启动台打开 KCode。"],
      },
      {
        type: "note",
        text: "若提示“已损坏，无法打开”，在终端执行：xattr -dr com.apple.quarantine /Applications/KCode.app",
      },
      { type: "h2", text: "Windows" },
      { type: "ol", items: ["下载 .exe 安装程序。", "按向导完成安装。", "从开始菜单启动。"] },
      { type: "h2", text: "Linux" },
      {
        type: "ol",
        items: [
          "下载 .AppImage、.deb 或 .rpm。",
          "AppImage 先 chmod +x KCode-*.AppImage；deb/rpm 用发行版包管理器安装。",
          "部分发行版需要 libfuse2 才能跑 AppImage。",
        ],
      },
      { type: "h2", text: "从源码启动" },
      { type: "code", text: "pnpm install\npnpm dev:desktop" },
      { type: "p", text: "Web 远控用 pnpm dev:web，CLI 在 apps/kcode-cli。Node 版本以仓库根目录 mise.toml 为准。" },
      { type: "h2", text: "首次启动" },
      {
        type: "ol",
        items: ["选择一个项目目录作为工作区。", "到设置里接入模型供应商，见「连接模型」。", "在对话里让 Agent 列出当前目录，确认响应正常。"],
      },
    ],
  },
  models: {
    title: "连接模型",
    lead: "KCode 不绑定官方套餐。在设置里填入你自己的供应商、接口地址和 API Key。",
    blocks: [
      { type: "h2", text: "怎么加" },
      {
        type: "ol",
        items: [
          "打开设置 → 模型。",
          "新增或选择一个供应商（OpenAI 兼容、Anthropic 或其他自定义端点）。",
          "填写 Base URL 和 API Key，保存后在输入条里选模型。",
        ],
      },
      { type: "p", text: "密钥只存在本机配置里，不会发去智谱或 Z.ai 账号接口。磁盘上若还留着上游 OAuth 凭据，运行时也不会再读。" },
      { type: "h2", text: "网络代理" },
      {
        type: "p",
        text: "设置 → 常规 可填 HTTP 代理，例如 http://127.0.0.1:7890。留空是直连，不会自动读 HTTP_PROXY。改完通常需要重启。",
      },
    ],
  },
  feedback: {
    title: "用户反馈与支持",
    lead: "KCode 没有官方客服。问题、回归和文档缺漏请提到 GitHub Issues。",
    blocks: [
      {
        type: "ul",
        items: [
          "写清操作系统、安装包或源码版本、复现步骤。",
          "不要在 Issue 里贴 API Key、Cookie 或真实用户数据。",
          "功能边界和风险说明见仓库 NOTICE.md。",
        ],
      },
    ],
  },
  agent: {
    title: "KCode Agent",
    lead: "工作台把任务、文件、终端、浏览器和 Git 状态放在同一个会话里推进。",
    blocks: [
      { type: "p", text: "输入交给 CLI / runtime 的 CommandInbox 串行处理。界面只保留未提交草稿和乐观层，不自己维护第二份已接受队列。" },
      {
        type: "ul",
        items: ["桌面走 desktop-continuous 实时链路。", "手机远控走 web-remote-replayable，靠快照补洞，不另起 Agent。", "高权限操作可要求变更前确认。"],
      },
    ],
  },
  goal: {
    title: "目标模式",
    lead: "用 Goal 把复杂工作拆成可勾选的步骤，边规划边执行边验证。",
    blocks: [
      { type: "p", text: "适合跨多个文件、需要反复检查的任务。Goal 进度属于任务状态，不要在前端另存一份清单。" },
    ],
  },
  browser: {
    title: "浏览器自动化",
    lead: "Agent 可以打开页面、点击、输入和截图，用来验收 Web 改动或读文档。",
    blocks: [
      { type: "p", text: "页面内容和登录态可能被读到模型上下文。处理不可信站点时收紧权限，并审查要提交的表单。" },
      { type: "note", text: "Computer Use 在本仓库是占位实现，不会提供系统级键鼠控制。" },
    ],
  },
  tasks: {
    title: "任务与文件管理",
    lead: "任务挂在工作区上。身份用 workspaceIdentity，文件操作仍用 workspacePath。",
    blocks: [
      { type: "p", text: "去重、绑定、缓存和持久化的 key 是 workspaceIdentity?.trim() || workspacePath。远程链路要同时带 identity 和 remoteSessionId，不能只按路径匹配。" },
    ],
  },
  remote: {
    title: "Remote Control",
    lead: "手机浏览器连到已经打开的桌面 Host，复用同一套会话，不为手机再起 Agent。",
    blocks: [
      { type: "p", text: "先在桌面打开工作区，再在 Web 端加入。外部 relay 只做鉴权、配对、心跳和转发，不保存任务队列。" },
    ],
  },
  plugins: {
    title: "Plugin",
    lead: "内置插件创建器。插件目录在仓库里，不再拉取官方市场 CDN。",
    blocks: [
      { type: "p", text: "启用插件可能带入 Hook、本地程序和远端工具。工作区级 MCP 会随运行时自动连接，启用前看清命令和环境变量。" },
    ],
  },
  skills: {
    title: "Skill",
    lead: "技能是给 Agent 的可复用说明书，可放在工作区或用户目录。",
    blocks: [
      { type: "p", text: "读取或展示技能文本不代表内容经过安全审查。来自不可信项目的技能，先当外部输入看。" },
    ],
  },
  "system-role": {
    title: "系统角色",
    lead: "托管系统角色写在 ~/.kcode/system-role.md。设置里可切换预设，也可以自己加规则。",
    blocks: [
      { type: "p", text: "默认预设对齐上游工作台语气。自定义预设存在本机，不经过官方账号。改完若界面没跟上，确认设置页读的是同一份投影，而不是另一份缓存。" },
    ],
  },
  mcp: {
    title: "MCP",
    lead: "MCP 用来接额外工具。用户目录和项目配置都可以声明服务器。",
    blocks: [
      { type: "p", text: "MCP 自己的 OAuth 与模型供应商登录不是一回事。KCode 已去掉智谱官方 OAuth，但你仍可能给某个 MCP 配它自己的授权。" },
    ],
  },
  shortcuts: {
    title: "快捷键表",
    lead: "桌面端常用键。具体以当前版本菜单为准。",
    blocks: [
      { type: "ul", items: ["⌘N / Ctrl+N 新建任务", "⌘Enter / Ctrl+Enter 发送", "Esc 取消当前生成", "⌘, / Ctrl+, 打开设置"] },
    ],
  },
  faq: {
    title: "常见问题解答",
    lead: "定位、安装和模型接入里最常见的几问。",
    blocks: [
      { type: "h2", text: "为什么没有登录？" },
      { type: "p", text: "官方登录和套餐已从运行时移除。用自己的供应商即可。" },
      { type: "h2", text: "安装包在哪下？" },
      { type: "p", text: "只在 GitHub Releases。官网主按钮按本机平台指向对应资产，失败则退到 latest 页面。" },
      { type: "h2", text: "macOS 提示已损坏？" },
      { type: "code", text: "xattr -dr com.apple.quarantine /Applications/KCode.app" },
      { type: "h2", text: "Linux AppImage 点了没反应？" },
      { type: "p", text: "先 chmod +x，再检查是否缺少 libfuse2。从终端启动一次看报错。" },
      { type: "h2", text: "和 ZCode 是什么关系？" },
      { type: "p", text: "源码来自上游 zai-org/ZCode，Apache-2.0。KCode 是学习用改版，与 Z.ai / 智谱无官方关联。" },
    ],
  },
};

const en: Record<DocSlug, DocPage> = {
  welcome: {
    title: "Welcome to KCode",
    lead: "KCode is an open-source AI coding workbench. It comes from upstream ZCode, with official Zhipu / Z.ai login and plans removed. You bring your own provider.",
    blocks: [
      { type: "p", text: "Use natural language for coding, debugging, tests, and review. Long work can stay in one session from plan to verify." },
      { type: "h2", text: "What changed from upstream" },
      {
        type: "ul",
        items: [
          "No official account login, OAuth, or coding plan.",
          "Installers live only on GitHub Releases.",
          "Plugins use the in-repo catalog, not the official CDN.",
          "Settings can toggle and edit a managed system role.",
        ],
      },
      { type: "h2", text: "Next" },
      { type: "ul", items: ["Install the desktop app or start from source.", "Add your own model provider in settings.", "Open a workspace and ask the agent to list the current directory.", "Version history is on the site changelog, projected from GitHub Releases."] },
      { type: "note", text: "For learning and reference only. No official service or availability guarantee." },
    ],
  },
  install: {
    title: "Install",
    lead: "Download a desktop build from GitHub Releases, or start from source.",
    blocks: [
      { type: "h2", text: "macOS" },
      { type: "ol", items: ["Open the KCode.dmg.", "Drag KCode.app into Applications.", "Launch it from Spotlight or Launchpad."] },
      { type: "note", text: "If macOS says the app is damaged: xattr -dr com.apple.quarantine /Applications/KCode.app" },
      { type: "h2", text: "Windows" },
      { type: "ol", items: ["Download the .exe.", "Finish the installer wizard.", "Start KCode from the Start menu."] },
      { type: "h2", text: "Linux" },
      { type: "ol", items: ["Grab .AppImage, .deb, or .rpm.", "chmod +x the AppImage, or install the package.", "Some distros need libfuse2 for AppImage."] },
      { type: "h2", text: "From source" },
      { type: "code", text: "pnpm install\npnpm dev:desktop" },
      { type: "p", text: "Web remote is pnpm dev:web. CLI lives in apps/kcode-cli. Node version follows mise.toml." },
    ],
  },
  models: {
    title: "Connect a model",
    lead: "There is no official plan. Add your own provider, base URL, and API key in settings.",
    blocks: [
      { type: "ol", items: ["Open Settings → Models.", "Add an OpenAI-compatible, Anthropic, or custom endpoint.", "Save, then pick the model in the composer."] },
      { type: "p", text: "Keys stay in local config. They are not sent to Zhipu or Z.ai account APIs." },
      { type: "h2", text: "Proxy" },
      { type: "p", text: "Settings → General can set an HTTP proxy such as http://127.0.0.1:7890. Empty means direct connect; HTTP_PROXY is not read automatically." },
    ],
  },
  feedback: {
    title: "Feedback",
    lead: "There is no official support desk. Use GitHub Issues.",
    blocks: [
      { type: "ul", items: ["Include OS, version, and repro steps.", "Never paste API keys or real user data.", "See NOTICE.md for boundaries and risk."] },
    ],
  },
  agent: {
    title: "KCode Agent",
    lead: "The workbench keeps the task, files, terminal, browser, and Git state in one session.",
    blocks: [
      { type: "p", text: "Accepted input is serialized by the CLI/runtime CommandInbox. The UI only keeps drafts and optimistic overlay." },
      { type: "ul", items: ["Desktop uses a live desktop-continuous stream.", "Phone remote uses web-remote-replayable snapshots.", "Risky tools can ask before edits."] },
    ],
  },
  goal: {
    title: "Goal mode",
    lead: "Goal splits long work into checkable steps: plan, execute, verify.",
    blocks: [{ type: "p", text: "Progress belongs to the task. Do not keep a second checklist in the UI." }],
  },
  browser: {
    title: "Browser automation",
    lead: "The agent can open pages, click, type, and screenshot to verify web changes.",
    blocks: [
      { type: "p", text: "Page content and cookies may enter model context. Tighten permissions on untrusted sites." },
      { type: "note", text: "Computer Use in this repo is a stub and does not drive the OS." },
    ],
  },
  tasks: {
    title: "Tasks and files",
    lead: "Tasks bind to a workspace. Identity uses workspaceIdentity; file IO uses workspacePath.",
    blocks: [
      { type: "p", text: "The identity key is workspaceIdentity?.trim() || workspacePath. Remote calls must pass both identity and remoteSessionId." },
    ],
  },
  remote: {
    title: "Remote control",
    lead: "A phone browser attaches to the desktop Host already running. No extra agent is started for mobile.",
    blocks: [{ type: "p", text: "Open the workspace on desktop first. The relay only authenticates, pairs, and forwards." }],
  },
  plugins: {
    title: "Plugin",
    lead: "There is a built-in plugin creator. The catalog is in-repo, not the official marketplace CDN.",
    blocks: [{ type: "p", text: "A plugin may install hooks, local binaries, and remote tools. Review commands before enabling." }],
  },
  skills: {
    title: "Skill",
    lead: "Skills are reusable instructions for the agent, from the workspace or your user directory.",
    blocks: [{ type: "p", text: "Showing a skill does not mean it was reviewed. Treat skills from untrusted repos as untrusted input." }],
  },
  "system-role": {
    title: "System role",
    lead: "The managed system role lives at ~/.kcode/system-role.md. Settings can switch presets or add your own.",
    blocks: [{ type: "p", text: "The default preset follows upstream workbench tone. Custom presets stay on disk and never go through an official account." }],
  },
  mcp: {
    title: "MCP",
    lead: "MCP adds extra tools from user or project config.",
    blocks: [{ type: "p", text: "MCP OAuth is not the retired Zhipu login. You may still authorize a specific MCP server." }],
  },
  shortcuts: {
    title: "Shortcuts",
    lead: "Common desktop keys. The running build's menus win if they differ.",
    blocks: [
      { type: "ul", items: ["⌘N / Ctrl+N new task", "⌘Enter / Ctrl+Enter send", "Esc stop generation", "⌘, / Ctrl+, settings"] },
    ],
  },
  faq: {
    title: "FAQ",
    lead: "The questions that come up first.",
    blocks: [
      { type: "h2", text: "Why is there no login?" },
      { type: "p", text: "Official login and billing were removed. Add your own provider." },
      { type: "h2", text: "Where are the installers?" },
      { type: "p", text: "GitHub Releases only. The homepage button maps to the asset for this machine." },
      { type: "h2", text: "How does this relate to ZCode?" },
      { type: "p", text: "Source comes from zai-org/ZCode under Apache-2.0. KCode is a learning fork and is not affiliated with Z.ai." },
    ],
  },
};

export function getDocPage(slug: string, locale: WebsiteLocale): DocPage | null {
  const pages = locale === "zh" ? zh : en;
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
