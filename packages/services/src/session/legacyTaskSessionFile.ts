import type { KCodeSessionFile, KCodeTaskMeta } from "@kcode/shared";
import { kcodeSessionFileSchema, kcodeTaskMetaSchema, kcodeTaskModeSchema } from "@kcode/shared";

export type LegacyTaskSessionFile = Omit<KCodeSessionFile, "meta"> & {
  meta: Omit<KCodeTaskMeta, "mode"> & { mode?: KCodeTaskMeta["mode"] };
};

const legacyTaskSessionFileSchema = kcodeSessionFileSchema.extend({
  // Claude 原生迁移会按清洗路径删除 meta.mode。
  // legacy snapshot 读取/写入仍要校验其它必需字段，但不能再强制把被过滤字段补回文件。
  meta: kcodeTaskMetaSchema.extend({
    mode: kcodeTaskModeSchema.optional(),
  }),
});

export function parseLegacyTaskSessionFile(input: unknown): LegacyTaskSessionFile {
  return legacyTaskSessionFileSchema.parse(input);
}

export function safeParseLegacyTaskSessionFile(input: unknown) {
  return legacyTaskSessionFileSchema.safeParse(input);
}
