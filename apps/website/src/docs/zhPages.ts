import type { DocPage } from "./types.js";
import type { DocSlug } from "./nav.js";

export const zhDocs: Record<DocSlug, DocPage> = {
  welcome: {
    title: "欢迎使用 KCode",
    lead: "KCode 是开源 AI 编程工作台。源码来自上游 ZCode，去掉了智谱 / Z.ai 登录和套餐，只保留你可以自己接上的桌面、浏览器和终端 Agent。",
    blocks: [
      {
        type: "p",
        text: "用自然语言做编码、调试、测试和变更审查。长任务可以在同一个会话里规划、执行、验证，不必反复补充背景。",
      },
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
      {
        type: "ul",
        items: [
          "先安装桌面端或从源码启动。",
          "在设置里接入你自己的模型供应商。",
          "打开一个工作区，让 Agent 列出当前目录确认连通。",
          "版本变化看官网「更新日志」，条目来自 GitHub Releases。",
        ],
      },
      { type: "note", text: "本项目仅供学习参考，不保证可用性与安全性，也不提供官方服务。" },
    ],
  },
  install: {
    title: "安装",
    lead: "从 GitHub Releases 下载桌面安装包，或用仓库里的开发命令从源码启动。",
    blocks: [
      {
        type: "p",
        text: "支持 macOS（Apple Silicon / Intel）、Windows（x64 / ARM64）、Linux（x64 / ARM64，AppImage、deb、rpm）。",
      },
      { type: "h2", text: "macOS" },
      {
        type: "ol",
        items: [
          "打开下载的 KCode.dmg。",
          "把 KCode.app 拖进 Applications。",
          "从启动台打开 KCode。",
        ],
      },
      {
        type: "note",
        text: "维护者尚未配齐签名证书时，安装包未签名。若提示“已损坏，无法打开”，在终端执行：xattr -dr com.apple.quarantine /Applications/KCode.app",
      },
      { type: "h2", text: "Windows" },
      { type: "ol", items: ["下载 .exe 安装程序。", "按向导完成安装。", "从开始菜单启动。"] },
      {
        type: "note",
        text: "维护者尚未配齐签名证书时，安装包未签名。SmartScreen 若提示无法识别，选「更多信息」→「仍要运行」。",
      },
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
      {
        type: "p",
        text: "Web 远控用 pnpm dev:web，CLI 在 apps/kcode-cli。Node 版本以仓库根目录 mise.toml 为准。",
      },
      { type: "h2", text: "首次启动" },
      {
        type: "ol",
        items: [
          "选择供应商并填入 API Key。欢迎页会先测通，再进入工作区。",
          "测不通时会分开说明是 Key、接口地址还是模型名。也可以先跳过，之后到设置里补。",
          "在对话里让 Agent 列出当前目录，确认响应正常。",
        ],
      },
    ],
  },
  models: {
    title: "连接模型",
    lead: "KCode 不绑定官方套餐。首次打开时选择供应商并填入 API Key，测通后才进入工作区。",
    blocks: [
      { type: "h2", text: "第一次打开" },
      {
        type: "ol",
        items: [
          "在欢迎页选择一个供应商，粘贴 API Key，点继续。",
          "测通后进入工作区。测不通会留在欢迎页，并说明是 Key、接口地址还是模型。",
          "可以先跳过。之后在设置 → 模型里补供应商、地址和 Key。",
        ],
      },
      { type: "h2", text: "常见接法" },
      {
        type: "ul",
        items: [
          "OpenAI 兼容：Base URL 一般以 /v1 结尾，再填 Key 和模型名。",
          "Anthropic 兼容：选 Anthropic 模板，填 Key；自定义网关时改 Base URL。",
          "其他自定义端点：在设置里新增供应商，自己填地址、Key 和模型 ID。",
        ],
      },
      { type: "h2", text: "失败时看哪一类" },
      {
        type: "ul",
        items: [
          "Key：密钥无效或没有权限。核对 Key，不要先改地址。",
          "接口地址：DNS、连接被拒绝、超时或证书错误。核对 Base URL、网络和代理。",
          "模型：地址通了，但模型名不存在或当前账号不可用。到设置里改模型 ID。",
        ],
      },
      {
        type: "p",
        text: "API Key 存在本机配置里，不进系统钥匙串，也不会发去智谱或 Z.ai 账号接口。对话、代码和工具结果会发到你填写的那个模型地址。",
      },
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
      {
        type: "p",
        text: "输入交给 CLI / runtime 的 CommandInbox 串行处理。界面只保留未提交草稿和乐观层，不自己维护第二份已接受队列。",
      },
      {
        type: "ul",
        items: [
          "桌面走 desktop-continuous 实时链路。",
          "手机远控走 web-remote-replayable，靠快照补洞，不另起 Agent。",
          "桌面交互默认逐次确认。命令行只传 --prompt 且不写 --mode 时是 yolo，普通工具不再逐次确认。",
        ],
      },
    ],
  },
  goal: {
    title: "目标模式",
    lead: "用 Goal 把复杂工作拆成可勾选的步骤，边规划边执行边验证。",
    blocks: [
      {
        type: "p",
        text: "适合跨多个文件、需要反复检查的任务。Goal 进度属于任务状态，不要在前端另存一份清单。",
      },
    ],
  },
  browser: {
    title: "浏览器自动化",
    lead: "Agent 可以打开页面、点击、输入和截图，用来验收 Web 改动或读文档。",
    blocks: [
      {
        type: "p",
        text: "页面内容和登录态可能被读到模型上下文。处理不可信站点时收紧权限，并审查要提交的表单。",
      },
      { type: "note", text: "Computer Use 在本仓库是占位实现，不会提供系统级键鼠控制。" },
    ],
  },
  tasks: {
    title: "任务与文件管理",
    lead: "任务挂在工作区上。身份用 workspaceIdentity，文件操作仍用 workspacePath。",
    blocks: [
      {
        type: "p",
        text: "去重、绑定、缓存和持久化的 key 是 workspaceIdentity?.trim() || workspacePath。远程链路要同时带 identity 和 remoteSessionId，不能只按路径匹配。",
      },
    ],
  },
  remote: {
    title: "Remote Control",
    lead: "手机浏览器连到已经打开的桌面 Host，复用同一套会话，不为手机再起 Agent。",
    blocks: [
      {
        type: "p",
        text: "先在桌面打开工作区，再在 Web 端加入。外部 relay 只做鉴权、配对、心跳和转发，不保存任务队列。",
      },
    ],
  },
  plugins: {
    title: "Plugin",
    lead: "内置插件创建器。插件目录在仓库里，不再拉取官方市场 CDN。",
    blocks: [
      {
        type: "p",
        text: "启用插件可能带入 Hook、本地程序和远端工具。工作区级 MCP 会随运行时自动连接，启用前看清命令和环境变量。",
      },
    ],
  },
  skills: {
    title: "Skill",
    lead: "技能是给 Agent 的可复用说明书，可放在工作区或用户目录。",
    blocks: [
      {
        type: "p",
        text: "读取或展示技能文本不代表内容经过安全审查。来自不可信项目的技能，先当外部输入看。",
      },
    ],
  },
  "system-role": {
    title: "系统角色",
    lead: "托管系统角色写在 ~/.kcode/system-role.md。设置里可切换预设，也可以自己加规则。",
    blocks: [
      {
        type: "p",
        text: "默认预设对齐上游工作台语气。自定义预设存在本机，不经过官方账号。改完若界面没跟上，确认设置页读的是同一份投影，而不是另一份缓存。",
      },
    ],
  },
  mcp: {
    title: "MCP",
    lead: "MCP 用来接额外工具。用户目录和项目配置都可以声明服务器。",
    blocks: [
      {
        type: "p",
        text: "MCP 自己的 OAuth 与模型供应商登录不是一回事。KCode 已去掉智谱官方 OAuth，但你仍可能给某个 MCP 配它自己的授权。",
      },
    ],
  },
  shortcuts: {
    title: "快捷键表",
    lead: "桌面端常用键。具体以当前版本菜单为准。",
    blocks: [
      {
        type: "ul",
        items: [
          "⌘N / Ctrl+N 新建任务",
          "⌘Enter / Ctrl+Enter 发送",
          "Esc 取消当前生成",
          "⌘, / Ctrl+, 打开设置",
        ],
      },
    ],
  },
  faq: {
    title: "常见问题解答",
    lead: "定位、安装和模型接入里最常见的几问。",
    blocks: [
      { type: "h2", text: "为什么没有登录？" },
      { type: "p", text: "官方登录和套餐已从运行时移除。用自己的供应商即可。" },
      { type: "h2", text: "安装包在哪下？" },
      {
        type: "p",
        text: "只在 GitHub Releases。官网主按钮按本机平台指向对应资产，失败则退到 latest 页面。",
      },
      { type: "h2", text: "macOS 提示已损坏？" },
      { type: "p", text: "维护者尚未配齐签名证书时，安装包未签名。在终端执行：" },
      { type: "code", text: "xattr -dr com.apple.quarantine /Applications/KCode.app" },
      { type: "h2", text: "Windows 提示无法识别的应用？" },
      { type: "p", text: "选「更多信息」→「仍要运行」。" },
      { type: "h2", text: "Linux AppImage 点了没反应？" },
      { type: "p", text: "先 chmod +x，再检查是否缺少 libfuse2。从终端启动一次看报错。" },
      { type: "h2", text: "命令行为什么直接改了文件？" },
      {
        type: "p",
        text: "kcode --prompt 不写 --mode 时使用 yolo，普通工具不再逐次确认。需要确认时加上 --mode build。桌面里的交互会话默认仍是逐次确认。",
      },
      { type: "h2", text: "和 ZCode 是什么关系？" },
      {
        type: "p",
        text: "源码来自上游 zai-org/ZCode，Apache-2.0。KCode 是学习用改版，与 Z.ai / 智谱无官方关联。",
      },
    ],
  },
};

