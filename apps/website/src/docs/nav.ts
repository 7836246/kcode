export type DocSlug =
  | "welcome"
  | "install"
  | "models"
  | "feedback"
  | "agent"
  | "goal"
  | "browser"
  | "tasks"
  | "remote"
  | "plugins"
  | "skills"
  | "system-role"
  | "mcp"
  | "shortcuts"
  | "faq";

export type DocGroupId = "start" | "core" | "help";

export const DOC_GROUPS: Array<{ id: DocGroupId; slugs: DocSlug[] }> = [
  { id: "start", slugs: ["welcome", "install", "models", "feedback"] },
  {
    id: "core",
    slugs: ["agent", "goal", "browser", "tasks", "remote", "plugins", "skills", "system-role", "mcp"],
  },
  { id: "help", slugs: ["shortcuts", "faq"] },
];
