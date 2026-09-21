import { z } from "zod";

/**
 * KCode agent 提供方的单一真源。
 *
 * 类型 KCodeProvider、运行时 schema kcodeProviderSchema 都从这里派生,
 * 避免各处内联 z.enum([...]) 副本随新增/删除 provider 漂移。
 * 本模块只依赖 zod(叶子),可被 validation / kcode-protocol 等无环引用。
 */
const KCODE_PROVIDERS = ["glm"] as const;

export const kcodeProviderSchema = z.enum(KCODE_PROVIDERS);

export type KCodeProvider = (typeof KCODE_PROVIDERS)[number];
