import { AskUserQuestionOutputSchema, type ToolResultDisplayPayload } from "@kcode/contracts";
import { boundDisplayText } from "./display-text.js";

// display 不经过 tool result budget，必须在这里单独限长：答案是用户自由输入，
// 无界载荷会随实时事件、tool part metadata 和 replayable snapshot 一起膨胀。
const MAX_ANSWER_DISPLAY_BYTES = 4 * 1024;

/**
 * AskUserQuestion 的结构化结果 → display 载荷。
 *
 * Bug 修复：工具结果文本由 formatModelContent 拍成 `User has answered your questions: "Q"="A"`，
 * 而展示侧被设计为不解析该文本，因此卡片回显用户答案只能靠这份结构化副本。载荷随
 * completedToolPartMetadata 落进 tool part 的 metadata.display，实时链路与冷恢复因此同源。
 *
 * 空 answers 也必须产出载荷：它是「用户未作答、runtime 自动继续」的显式语义，
 * 与「没有 display」（拒绝/取消/旧数据）在卡片上是两种文案。
 */
export function createAskUserQuestionDisplay(
  output: unknown,
): ToolResultDisplayPayload | undefined {
  const parsed = AskUserQuestionOutputSchema.safeParse(output);
  if (!parsed.success) return undefined;

  const answers: Record<string, string> = {};
  for (const [question, answer] of Object.entries(parsed.data.answers)) {
    answers[question] = boundDisplayText(answer, MAX_ANSWER_DISPLAY_BYTES).value;
  }
  return { kind: "ask_user_question", answers };
}
