import type { DocPage } from "./types.js";
import type { DocSlug } from "./nav.js";

export const enDocs: Record<DocSlug, DocPage> = {
  welcome: {
    title: "Welcome to KCode",
    lead: "KCode is an open-source AI coding workbench. It comes from upstream ZCode, with official Zhipu / Z.ai login and plans removed. You bring your own provider.",
    blocks: [
      {
        type: "p",
        text: "Use natural language for coding, debugging, tests, and review. Long work can stay in one session from plan to verify.",
      },
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
      {
        type: "ul",
        items: [
          "Install the desktop app or start from source.",
          "Add your own model provider in settings.",
          "Open a workspace and ask the agent to list the current directory.",
          "Version history is on the site changelog, projected from GitHub Releases.",
        ],
      },
      {
        type: "note",
        text: "For learning and reference only. No official service or availability guarantee.",
      },
    ],
  },
  install: {
    title: "Install",
    lead: "Download a desktop build from GitHub Releases, or start from source.",
    blocks: [
      { type: "h2", text: "macOS" },
      {
        type: "ol",
        items: [
          "Open the KCode.dmg.",
          "Drag KCode.app into Applications.",
          "Launch it from Spotlight or Launchpad.",
        ],
      },
      {
        type: "note",
        text: "Until signing certificates are configured, the build is unsigned. If macOS says the app is damaged: xattr -dr com.apple.quarantine /Applications/KCode.app",
      },
      { type: "h2", text: "Windows" },
      {
        type: "ol",
        items: [
          "Download the .exe.",
          "Finish the installer wizard.",
          "Start KCode from the Start menu.",
        ],
      },
      {
        type: "note",
        text: "Until signing certificates are configured, the build is unsigned. If SmartScreen does not recognize the app, choose More info → Run anyway.",
      },
      { type: "h2", text: "Linux" },
      {
        type: "ol",
        items: [
          "Grab .AppImage, .deb, or .rpm.",
          "chmod +x the AppImage, or install the package.",
          "Some distros need libfuse2 for AppImage.",
        ],
      },
      { type: "h2", text: "From source" },
      { type: "code", text: "pnpm install\npnpm dev:desktop" },
      {
        type: "p",
        text: "Web remote is pnpm dev:web. CLI lives in apps/kcode-cli. Node version follows mise.toml.",
      },
    ],
  },
  models: {
    title: "Connect a model",
    lead: "There is no official plan. The first launch asks for a provider and API key, and opens a workspace only after the connection succeeds.",
    blocks: [
      { type: "h2", text: "First launch" },
      {
        type: "ol",
        items: [
          "Pick a provider on the welcome screen, paste the API key, and continue.",
          "A successful test opens the workspace. A failed test stays on the welcome screen and says whether the key, endpoint, or model is wrong.",
          "You can skip. Add the provider, base URL, and key later in Settings → Models.",
        ],
      },
      { type: "h2", text: "Common setups" },
      {
        type: "ul",
        items: [
          "OpenAI-compatible: a base URL that usually ends in /v1, plus a key and model name.",
          "Anthropic-compatible: use the Anthropic template and a key. Change the base URL for a custom gateway.",
          "Any other endpoint: add a provider in Settings and fill the URL, key, and model id yourself.",
        ],
      },
      { type: "h2", text: "Which failure is which" },
      {
        type: "ul",
        items: [
          "Key: the secret is invalid or not allowed. Check the key before changing the URL.",
          "Endpoint: DNS, connection refused, timeout, or certificate. Check the base URL, network, and proxy.",
          "Model: the endpoint answered, but the model name is missing or unavailable. Change the model id in Settings.",
        ],
      },
      {
        type: "p",
        text: "The API key stays in local config. It is not stored in the system keychain and is not sent to Zhipu or Z.ai account APIs. Conversations, code, and tool results go to the model endpoint you configured.",
      },
      { type: "h2", text: "Proxy" },
      {
        type: "p",
        text: "Settings → General can set an HTTP proxy such as http://127.0.0.1:7890. Empty means direct connect; HTTP_PROXY is not read automatically.",
      },
    ],
  },
  feedback: {
    title: "Feedback",
    lead: "There is no official support desk. Use GitHub Issues.",
    blocks: [
      {
        type: "ul",
        items: [
          "Include OS, version, and repro steps.",
          "Never paste API keys or real user data.",
          "See NOTICE.md for boundaries and risk.",
        ],
      },
    ],
  },
  agent: {
    title: "KCode Agent",
    lead: "The workbench keeps the task, files, terminal, browser, and Git state in one session.",
    blocks: [
      {
        type: "p",
        text: "Accepted input is serialized by the CLI/runtime CommandInbox. The UI only keeps drafts and optimistic overlay.",
      },
      {
        type: "ul",
        items: [
          "Desktop uses a live desktop-continuous stream.",
          "Phone remote uses web-remote-replayable snapshots.",
          "Desktop sessions ask before tools run. kcode --prompt without --mode uses yolo, so ordinary tools are not confirmed one by one.",
        ],
      },
    ],
  },
  goal: {
    title: "Goal mode",
    lead: "Goal splits long work into checkable steps: plan, execute, verify.",
    blocks: [
      {
        type: "p",
        text: "Progress belongs to the task. Do not keep a second checklist in the UI.",
      },
    ],
  },
  browser: {
    title: "Browser automation",
    lead: "The agent can open pages, click, type, and screenshot to verify web changes.",
    blocks: [
      {
        type: "p",
        text: "Page content and cookies may enter model context. Tighten permissions on untrusted sites.",
      },
      { type: "note", text: "Computer Use in this repo is a stub and does not drive the OS." },
    ],
  },
  tasks: {
    title: "Tasks and files",
    lead: "Tasks bind to a workspace. Identity uses workspaceIdentity; file IO uses workspacePath.",
    blocks: [
      {
        type: "p",
        text: "The identity key is workspaceIdentity?.trim() || workspacePath. Remote calls must pass both identity and remoteSessionId.",
      },
    ],
  },
  remote: {
    title: "Remote control",
    lead: "A phone browser attaches to the desktop Host already running. No extra agent is started for mobile.",
    blocks: [
      {
        type: "p",
        text: "Open the workspace on desktop first. The relay only authenticates, pairs, and forwards.",
      },
    ],
  },
  plugins: {
    title: "Plugin",
    lead: "There is a built-in plugin creator. The catalog is in-repo, not the official marketplace CDN.",
    blocks: [
      {
        type: "p",
        text: "A plugin may install hooks, local binaries, and remote tools. Review commands before enabling.",
      },
    ],
  },
  skills: {
    title: "Skill",
    lead: "Skills are reusable instructions for the agent, from the workspace or your user directory.",
    blocks: [
      {
        type: "p",
        text: "Showing a skill does not mean it was reviewed. Treat skills from untrusted repos as untrusted input.",
      },
    ],
  },
  "system-role": {
    title: "System role",
    lead: "The managed system role lives at ~/.kcode/system-role.md. Settings can switch presets or add your own.",
    blocks: [
      {
        type: "p",
        text: "The default preset follows upstream workbench tone. Custom presets stay on disk and never go through an official account.",
      },
    ],
  },
  mcp: {
    title: "MCP",
    lead: "MCP adds extra tools from user or project config.",
    blocks: [
      {
        type: "p",
        text: "MCP OAuth is not the retired Zhipu login. You may still authorize a specific MCP server.",
      },
    ],
  },
  shortcuts: {
    title: "Shortcuts",
    lead: "Common desktop keys. The running build's menus win if they differ.",
    blocks: [
      {
        type: "ul",
        items: [
          "⌘N / Ctrl+N new task",
          "⌘Enter / Ctrl+Enter send",
          "Esc stop generation",
          "⌘, / Ctrl+, settings",
        ],
      },
    ],
  },
  faq: {
    title: "FAQ",
    lead: "The questions that come up first.",
    blocks: [
      { type: "h2", text: "Why is there no login?" },
      { type: "p", text: "Official login and billing were removed. Add your own provider." },
      { type: "h2", text: "Where are the installers?" },
      {
        type: "p",
        text: "GitHub Releases only. The homepage button maps to the asset for this machine.",
      },
      { type: "h2", text: "macOS says the app is damaged?" },
      { type: "p", text: "Until signing certificates are configured, the build is unsigned. Run this in Terminal:" },
      { type: "code", text: "xattr -dr com.apple.quarantine /Applications/KCode.app" },
      { type: "h2", text: "Windows says the app is unrecognized?" },
      { type: "p", text: "Choose More info → Run anyway." },
      { type: "h2", text: "Why did the CLI edit files without asking?" },
      {
        type: "p",
        text: "kcode --prompt without --mode uses yolo, so ordinary tools are not confirmed one by one. Pass --mode build to ask first. Desktop interactive sessions still ask by default.",
      },
      { type: "h2", text: "How does this relate to ZCode?" },
      {
        type: "p",
        text: "Source comes from zai-org/ZCode under Apache-2.0. KCode is a learning fork and is not affiliated with Z.ai.",
      },
    ],
  },
};

