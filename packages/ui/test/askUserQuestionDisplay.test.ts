import assert from "node:assert/strict";
import test from "node:test";
import {
  askUserQuestionDisplaySchema,
  toolOutputSchema,
} from "../../shared/src/kcode-protocol-v4/toolDisplay.js";
import {
  getAskUserQuestionAnswerText,
  normalizeAskUserQuestionInput,
  readAskUserQuestionAnswers,
} from "../src/lib/askUserQuestion.js";

// desktop v4 卡片回显用户答案的验收面：结构化答案只在 output.display（kind = ask_user_question）
// 里；模型可见文本由 CLI 的 formatModelContent 拍成 `"Q"="A"`，前端被设计为不解析它。
const QUESTION = "用哪个方案？";
const NO_ANSWER = "未提供回答";

function questionOf(multiSelect: boolean) {
  const data = normalizeAskUserQuestionInput({
    questions: [{ question: QUESTION, multiSelect, options: ["A 方案", "B 方案"] }],
  });
  const question = data.questions[0];
  assert.ok(question);
  return question;
}

test("display 通道回显结构化答案，空对象是「未作答、自动继续」的显式语义", () => {
  assert.deepEqual(
    readAskUserQuestionAnswers({
      display: { kind: "ask_user_question", answers: { [QUESTION]: "A 方案" } },
      // 同时给出模型文本：它是纯展示文本，不得被当作答案来源。
      output: `User has answered your questions: "${QUESTION}"="A 方案".`,
    }),
    { [QUESTION]: "A 方案" },
  );
  assert.deepEqual(
    readAskUserQuestionAnswers({ display: { kind: "ask_user_question", answers: {} } }),
    {},
  );
});

test("非 ask_user_question 的 display 不参与答案解析", () => {
  assert.equal(
    readAskUserQuestionAnswers({
      display: { kind: "cua", schemaVersion: 1, toolName: "request_access", status: "success" },
    }),
    undefined,
  );
  assert.equal(readAskUserQuestionAnswers({ display: { kind: "ask_user_question" } }), undefined);
});

test("多选答案按产品列表约定用「，」连接", () => {
  const multi = questionOf(true);
  assert.equal(
    getAskUserQuestionAnswerText(multi, { [QUESTION]: "A 方案, B 方案" }, NO_ANSWER),
    "A 方案，B 方案",
  );
  // 上游合并分隔符出现在自由输入里时按列表分隔处理：代价仅是标点，不改写文本内容。
  assert.equal(
    getAskUserQuestionAnswerText(multi, { [QUESTION]: "自定义, 带逗号" }, NO_ANSWER),
    "自定义，带逗号",
  );
});

test("单选回显原样文本；缺答案回落到无答案文案", () => {
  const single = questionOf(false);
  assert.equal(
    getAskUserQuestionAnswerText(single, { [QUESTION]: "自定义, 带逗号" }, NO_ANSWER),
    "自定义, 带逗号",
  );
  assert.equal(getAskUserQuestionAnswerText(single, {}, NO_ANSWER), NO_ANSWER);
  assert.equal(getAskUserQuestionAnswerText(single, undefined, NO_ANSWER), NO_ANSWER);
});

test("v4 协议镜像接受结构化答案 display，并保持 strict", () => {
  const display = { kind: "ask_user_question" as const, answers: { [QUESTION]: "A 方案" } };
  // 缺 union 成员时 toolOutput.display 会被 .catch(undefined) 静默剥掉，这就是原 bug 的形态。
  assert.deepEqual(toolOutputSchema.parse({ text: "模型可见文本", display }).display, display);
  assert.equal(askUserQuestionDisplaySchema.safeParse({ ...display, extra: true }).success, false);
});

test("旧「单条答案」形态只归属单题输入，多题输入不凭空记到第一题", () => {
  const single = { question: QUESTION, options: [{ label: "A 方案" }, { label: "B 方案" }] };
  assert.deepEqual(
    readAskUserQuestionAnswers({
      input: single,
      output: { type: "answered", selected: "A 方案" },
    }),
    { [QUESTION]: "A 方案" },
  );
  assert.equal(
    readAskUserQuestionAnswers({
      input: {
        questions: [single, { question: "还要什么？", options: [{ label: "C" }, { label: "D" }] }],
      },
      output: { type: "answered", selected: "A 方案" },
    }),
    undefined,
  );
});
