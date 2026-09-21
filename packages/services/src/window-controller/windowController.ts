import type { Event } from "@kcode/rpc";
import { ServiceChannels } from "@kcode/shared";
import type { KCodeTaskMeta } from "@kcode/shared";
import type {
  ControllerResyncParams,
  ControllerResyncResult,
  ControllerSubscribeParams,
  ControllerSubscribeResult,
  ControllerUnsubscribeParams,
  WindowHostControllerTaskFrame,
  WindowHostControllerTaskRow,
  WindowHostControllerWorkspaceFrame,
  WindowHostTaskAddress,
} from "@kcode/shared/kcode-protocol-v4";
import { createServiceDescriptor } from "../descriptors.js";
import type { KCodeArchivedTaskDeletionResult } from "#src/session/kcodeTaskService.js";
import type {
  KCodeTaskListItem,
  KCodeTaskListQuery,
  KCodeTaskListResult,
} from "../session/kcodeTaskListTypes.js";

export type WindowHostControllerMutation =
  | { kind: "pin"; pinned: boolean }
  | { kind: "archive"; archived: boolean }
  | { kind: "delete" }
  | { kind: "delete-archived" }
  | { kind: "mark-read"; expectedUnreadAt?: number }
  | { kind: "mark-unread" }
  | { kind: "open" }
  | { kind: "resume" };

export type WindowHostControllerTaskListItem = KCodeTaskListItem & {
  remoteSessionId?: string;
  sourceAvailability: "online" | "offline";
  liveStatus: WindowHostControllerTaskRow["liveStatus"];
  activity?: WindowHostControllerTaskRow["activity"];
};

export interface WindowHostControllerTaskListResult extends Omit<KCodeTaskListResult, "items"> {
  items: WindowHostControllerTaskListItem[];
}

export type WindowHostControllerFrame =
  | WindowHostControllerTaskFrame
  | WindowHostControllerWorkspaceFrame;

/**
 * 窗口级 Controller 服务只承载列表投影与跨 source 路由。
 * conversation/file/git/terminal 仍由 attachment 对应的 scoped facade 提供。
 */
export interface IWindowControllerService {
  deleteArchivedTask(params: { address: WindowHostTaskAddress }): Promise<boolean>;
  deleteArchivedTasks(params: {
    address: WindowHostTaskAddress;
    taskIds: string[];
  }): Promise<KCodeArchivedTaskDeletionResult>;
  listTaskList(params: KCodeTaskListQuery): Promise<WindowHostControllerTaskListResult>;
  mutateTask(params: {
    address: WindowHostTaskAddress;
    mutation: WindowHostControllerMutation;
  }): Promise<KCodeTaskMeta | null>;
  subscribeControllerV4(params: ControllerSubscribeParams): Promise<ControllerSubscribeResult>;
  resyncControllerV4(params: ControllerResyncParams): Promise<ControllerResyncResult>;
  unsubscribeControllerV4(params: ControllerUnsubscribeParams): Promise<void>;
  onDynamicControllerFrame(): Event<WindowHostControllerFrame>;
}

export const IWindowControllerService = createServiceDescriptor<IWindowControllerService>(
  ServiceChannels.WindowController,
);
