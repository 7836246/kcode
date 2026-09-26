import assert from "node:assert/strict";
import test from "node:test";
import {
  parseCompletedToolPartMetadata,
  parseToolResultDisplayPayload,
  type AskUserQuestionOutput,
  type AskUserQuestionToolResultDisplayPayload,
} from "@kcode/contracts";
import { createAskUserQuestionDisplay } from "./ask-user-question-display.js";

const FIRST_QUESTION = "用哪个方案？";
const SECOND_QUESTION = "要开哪些开关？";

function question(questionText: string, multiSelect: boolean) {
  return {
    question: questionText,
    header: "方案",
    options: [
      { label: "A 方案", description: "先做 A" },
      { label: "B 方案", description: "先做 B" },
    ],
    multiSelect,
  };
}

function outputWith(answers: Record<string, string>): AskUserQuestionOutput {
  return {
    questions: [question(FIRST_QUESTION, false), question(SECOND_QUESTION, true)],
    answers,
  };
}

function displayOf(output: unknown): AskUserQuestionToolResultDisplayPayload {
  const display = createAskUserQuestionDisplay(output);
  assert.ok(display, "结构化答案必须产出 display 载荷");
  assert.equal(display.kind, "ask_user_question");
  return display as AskUserQuestionToolResultDisplayPayload;
}

test("多题答案按问题原文逐条进入 display；多选字符串不被构造侧改写", () => {
  const answers = { [FIRST_QUESTION]: "A 方案", [SECOND_QUESTION]: "A 方案, B 方案" };
  assert.deepEqual(displayOf(outputWith(answers)).answers, answers);
});

test("answers 为空仍产出载荷（用户未作答、runtime 自动继续）", () => {
  assert.deepEqual(displayOf(outputWith({})).answers, {});
});

test("非 AskUserQuestion 形态的输出不产出 display", () => {
  assert.equal(createAskUserQuestionDisplay(undefined), undefined);
  assert.equal(createAskUserQuestionDisplay({ answers: {} }), undefined);
  assert.equal(createAskUserQuestionDisplay("User has answered your questions"), undefined);
});

test("display 载荷通过落库 schema 与 tool part metadata 往返（冷恢复同源）", () => {
  const display = displayOf(outputWith({ [FIRST_QUESTION]: "A 方案" }));
  assert.deepEqual(parseToolResultDisplayPayload(display), display);
  assert.deepEqual(parseCompletedToolPartMetadata({ schemaVersion: 1, display })?.display, display);
});

test("超长答案按 4 KiB 截断，截断结果仍能通过落库 schema", () => {
  const display = displayOf(outputWith({ [FIRST_QUESTION]: "自定义输入".repeat(2_000) }));
  const bounded = display.answers[FIRST_QUESTION];
  assert.ok(bounded);
  assert.ok(Buffer.byteLength(bounded, "utf8") <= 4 * 1024);
  assert.match(bounded, /\[truncated\]$/u);
  assert.deepEqual(parseToolResultDisplayPayload(display), display);
});
