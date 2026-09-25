import { z } from "zod";

/** 仅承载已提交内容引用与展示元信息；内容本体不进入 command/topic frame。 */
export const attachmentRefSchema = z
  .object({
    ref: z.string(),
    fileName: z.string(),
    mime: z.string(),
    bytes: z.number(),
    previewRef: z.string().optional(),
    // 附件在上下文里是否被截断；缺省表示未知（老行与发送前都没有此字段），不得当成「未截断」。
    truncated: z.boolean().optional(),
    totalLines: z.number().optional(),
  })
  .strict();

export type AttachmentRef = z.infer<typeof attachmentRefSchema>;
