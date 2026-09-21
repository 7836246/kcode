import type { WorkspacePurpose, KCodeTaskMeta } from "@kcode/shared";

export type KCodeTaskListKind = "pinned" | "archived" | "timeline" | "active";
export type KCodeTaskListSortBy = "created" | "updated";

export interface KCodeTaskListWorkspaceScope {
  workspacePath: string;
  workspaceIdentity?: string;
  workspacePurpose?: WorkspacePurpose;
}

export interface KCodeTaskListQuery {
  kind: KCodeTaskListKind;
  workspaceScopes: KCodeTaskListWorkspaceScope[];
  sortBy: KCodeTaskListSortBy;
  search?: string;
  limit?: number;
}

export type KCodeTaskListItem = KCodeTaskMeta & {
  searchSnippet?: string;
  searchSnippets?: string[];
};

export interface KCodeTaskListResult {
  items: KCodeTaskListItem[];
  total: number;
  hasMore: boolean;
}

export type KCodeTaskGroupColor =
  | "gray"
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "purple";

export interface KCodeTaskGroup {
  id: string;
  title: string;
  color: KCodeTaskGroupColor;
  createdAt: number;
  updatedAt: number;
}

export interface KCodeGroupedTaskRef {
  workspacePath: string;
  workspaceIdentity?: string;
  taskId: string;
}

export type KCodeGroupedTaskViewTopLevelNodeRef =
  | { type: "group"; groupId: string }
  | { type: "task"; task: KCodeGroupedTaskRef };

export type KCodeGroupedTaskViewNode =
  | {
      type: "group";
      group: KCodeTaskGroup;
      tasks: KCodeTaskListItem[];
      sortOrder?: number;
    }
  | {
      type: "task";
      task: KCodeTaskListItem;
      sortOrder?: number;
    };

export interface KCodeGroupedTaskView {
  nodes: KCodeGroupedTaskViewNode[];
}

export interface KCodeGroupedTaskViewQuery {
  workspaceScopes: KCodeTaskListWorkspaceScope[];
  includeAllWorkspaces?: boolean;
}

// ── grouped 原始结构（不 join tasks 表）──
// grouped 视图的任务数据源迁到 sessions-index 后，服务端只提供分组结构
// （task_groups / task_group_members / task_group_view_node_orders），
// 由客户端与 sessions-index 会话做 join。

/** 组成员引用（不含任务 meta；task 内容由 sessions-index 提供）。 */
export interface KCodeGroupedTaskViewStructureMember {
  groupId: string;
  /** 服务端口径 workspaceKey（resolveWorkspaceKey：identity ?? path），join 匹配键。 */
  workspaceKey: string;
  workspacePath: string;
  workspaceIdentity?: string;
  taskId: string;
  /** null = 尚未落 sort_order（新加入组）；客户端按 addedAt 降序补内存序。 */
  sortOrder: number | null;
  addedAt: number;
}

/** 顶层节点排序（task_group_view_node_orders，node_key 已解析为结构化引用）。 */
export type KCodeGroupedTaskViewStructureTopOrder =
  | { type: "group"; groupId: string; sortOrder: number }
  | { type: "task"; workspaceKey: string; taskId: string; sortOrder: number };

export interface KCodeGroupedTaskViewStructure {
  /** 已按 workspaceScopes 可见性过滤的 group（bootstrap workspace group 只在其 workspace 可见）。 */
  groups: KCodeTaskGroup[];
  /** 全量组成员（含不可见 group 的成员——顶层排除规则需要全量判断）。 */
  members: KCodeGroupedTaskViewStructureMember[];
  topLevelOrders: KCodeGroupedTaskViewStructureTopOrder[];
}

export interface KCodeGroupedTaskViewOrderInput {
  workspaceScopes: KCodeTaskListWorkspaceScope[];
  topLevelNodes: KCodeGroupedTaskViewTopLevelNodeRef[];
  groups: Array<{
    groupId: string;
    taskRefs: KCodeGroupedTaskRef[];
  }>;
}

export interface KCodeWorkspaceEventSubscriptionParams {
  workspacePath: string;
  workspaceIdentity?: string;
}
