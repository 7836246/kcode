# kcode.wiki 产品官网

## 行为

`kcode.wiki` 是独立营销落地页，不复用 `packages/web` 的远控工作台，也不提供登录、OAuth 或套餐购买。

页面结构对齐 [ZCode 官网](https://zcode.z.ai/)：顶栏、主标题、主下载按钮、产品窗体演示、能力说明、全平台下载、页脚。Z 一律换成 K。不出现智谱 / Z.ai 登录、Coding Plan 定价或官方套餐入口。

视觉一比一对齐 [ZCode 官网](https://zcode.z.ai/)：复用其落地页 Tailwind / Geist CSS，以及 `img-goal` / `img-bot` / `img-glm53`、hero-visual 图片。CSS 与素材落地到 `apps/website`，运行时不热链 zcode.z.ai。顶栏 Logo 与文案换成 K，去掉登录；下载仍走 GitHub Releases，不接官方套餐购买。

```text
访客
  → 顶栏（Logo / 文档 / 更新日志 / 下载 | GitHub 图标 / 日夜 / 语言）
  → 主下载按钮（按本机 OS / 架构指向对应 GitHub Release 资产）
  → 文档 /docs/:slug（侧栏目录 + 正文）
  → 更新日志 /changelog（GitHub Releases 投影，不手写官方套餐记录）
  → 全部下载（mac / win / linux）
  → 失败时退回 /releases/latest
```

- 域名与对外文案使用 `kcode.wiki`
- 安装包只从 `https://github.com/7836246/kcode/releases` 提供
- 版本优先读 GitHub latest release；失败则链到 latest 页面，不编造资产
- 主下载目标由 `detectDownloadTarget` 唯一投影。先用 UA / platform，再按 Client Hints `architecture` 校正。Mac 浏览器普遍把 Apple Silicon 写成 `Intel Mac OS X`，不能据此判 x64；只有明确 `architecture=x86` 才推荐 Intel，其余 Mac 默认 Apple 芯片。「查看全部下载」可改选
- 官网静态资源由 `deploy-website` 同步到 `kcode.wiki` 这台源站；不走 GitHub Pages。下载与更新日志继续读同一仓库的 Releases，跟桌面 `v*` tag 联动
- `kcode.wiki` / `www.kcode.wiki` 解析到源站 `23.94.223.164`，Cloudflare 橙云代理；`/docs` 与 `/changelog` 由源站 Nginx 回 `index.html`
- 默认中文，可切英文；不设账号
- 日夜模式由 `theme` 唯一写入 `documentElement` 与 `localStorage`；无记录时默认夜间，不跟随系统
- TDK 由 `resolvePageSeo` 按路由和语言投影到 `title` / `description` / `keywords`、canonical 与 Open Graph；首页静态 HTML 先写中文默认值，方便不执行脚本的抓取
- 原站 PNG / hero-visual 按深色产品壳绘制。浅色页只换营销 chrome；能力卡图底与 `.hero-visual-theme` 锁定深色 token，避免黑图落在白底上
- 源码入口在顶栏右侧工具区，用 GitHub 图标；文案 `navSource` 只作 aria-label / title。文字导航只保留文档、更新日志、下载
- 反色主按钮上的次级文字用 `text-background` 透明度，不用 `text-muted-foreground`
- 文档信息架构对齐 ZCode Docs（开始使用 / 核心功能 / 帮助），正文按 KCode 事实改写，不写官方登录或套餐
- 安装包未签名。文档写清 macOS 去隔离、Windows SmartScreen「仍要运行」、Linux AppImage 先 chmod；不承诺双击即开
- 文档篇末上一篇 / 下一篇用卡片切换，和最后一节至少隔开一段再画分割线；短文也不贴在正文下面。切换后滚到页顶
- 更新日志信息架构对齐 ZCode Changelog（版本标题 / 分组说明），条目由 `resolveChangelog` 从 GitHub Releases 投影，失败或空列表不编造
- 路由由 `parseSitePath` 投影：`/` 首页，`/docs` 与 `/docs/:slug` 文档，`/changelog` 更新日志
- 页脚写清 Apache-2.0、上游 ZCode、仅供学习参考
- 页面 class 与 zcode.z.ai 落地页一致，样式来自 vendored Tailwind，不另写一套营销皮肤
- Hero 工作台区使用从原站导出的 `hero-visual` DOM + 原站 CSS / 图片
- 能力卡使用原站三张 PNG，配原站卡片 class；图片落在深色画布上

## 所有者

`apps/website` 是官网唯一实现。下载地址由 `resolveReleaseDownloads` 投影，不在组件里手写资产名。更新日志由 `resolveChangelog` 投影 GitHub Releases。主题由 `resolveTheme` / `applyTheme` 投影。文档正文由 `docsContent` 拥有，侧栏只读目录。TDK 由 `resolvePageSeo` 投影，`applyPageSeo` 写入 document。`deploy-website` 是源站发布的唯一入口，用 SSH 同步 `/var/www/kcode.wiki`，不打桌面安装包。

## 验收

- 打开首页没有登录按钮
- 顶栏中间文字导航只有文档 / 更新日志 / 下载；源码在右侧，显示为 GitHub 图标
- 主 CTA 和「全部下载」都指向 GitHub Release，不指向 zcode.z.ai
- Apple Silicon 或未标明架构的 Mac 主按钮推荐 Apple 芯片；只有明确 x86 才推荐 Intel
- 文案与 Logo 为 KCode，不见 ZCode 产品标或智谱套餐
- 中英文切换后标题、下载、页脚一起变
- 窄屏下顶栏收进菜单，下载列表可点
- Hero 是原站同款工作台窗体，不是自制简图
- 三张能力卡使用 `img-goal` / `img-bot` / `img-glm53`，不是纯文字或重绘 HTML
- 顶栏可切换日夜，刷新后保持；无记录时是夜间
- 首页、文档、更新日志的 title / description / keywords 随语言和路由变；源码里能看到中文默认 TDK
- 浅色模式下能力卡图和 Hero 工作台仍是深色产品壳，不是白底上的黑块
- 浅色主下载按钮的标题和平台行都可读
- `/docs` 与 `/docs/install` 能打开文档，侧栏可跳转
- 安装页和 FAQ 写明未签名包：macOS 去隔离、Windows 仍要运行、Linux chmod
- 文档篇末上一篇 / 下一篇是两张卡片，不贴在正文最后一行下面
- `/changelog` 列出 GitHub Release，不出现智谱登录或套餐更新
- 文档不出现智谱登录、Coding Plan 购买或官方套餐步骤
- 推送 `main` 上官网相关文件后，源站 `/var/www/kcode.wiki` 更新；站点下载按钮指向当前 latest Release，不手写版本号
- `https://kcode.wiki` 与 `/docs`、`/changelog` 能打开
