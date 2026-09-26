import { CircleHelpIcon } from "lucide-react";
import { useCallback } from "react";
import {
  getAskUserQuestionAnswerText,
  normalizeAskUserQuestionInput,
  readAskUserQuestionAnswers,
  readAskUserQuestionInput,
} from "@/lib/askUserQuestion.js";
import { useKCodeIntl } from "@/i18n/IntlProvider.js";
import { ToolLayout } from "@/ToolCallBlocks/ToolLayout.js";
import { readToolResultDisplay } from "@/ToolCallBlocks/toolResultDisplay.js";
import type { ToolCallBlockRenderContext } from "@/ToolCallBlocks/shared.js";

const ASK_QUESTION_TOOL_ICON = (
  <CircleHelpIcon className="size-4 shrink-0 text-foreground-subtle" />
);

export function AskQuestionToolCallBlock(context: ToolCallBlockRenderContext) {
  const { intl } = useKCodeIntl();
  const { toolCallNode, isRunning, statusLabel, errorText } = context;
  const { toolCall } = toolCallNode;
  const input = readAskUserQuestionInput(toolCall);
  const data = normalizeAskUserQuestionInput(input);
  // 结构化答案只走 display 通道（desktop v4 唯一携带 answers 的载体，冷恢复同源）；
  // 其余载体继续兜住旧快照与旧客户端形态。
  const answers =
    readAskUserQuestionAnswers({ ...toolCall, display: readToolResultDisplay(toolCall.raw) }) ??
    data.answers;
  const wasAutomaticallyContinued =
    !isRunning &&
    toolCall.status !== "failed" &&
    answers !== undefined &&
    Object.keys(answers).length === 0;
  const noAnswerText = intl.formatMessage({
    id: wasAutomaticallyContinued
      ? "chat.askQuestion.autoContinued"
      : "chat.askQuestion.noAnswerProvided",
  });
  const questionCount = data.questions.length;
  const isFailed = toolCall.status === "failed";
  const renderContent = useCallback(
    () =>
      !isRunning || isFailed ? (
        <div className="ml-2 space-y-2 border-l border-border pl-3.5">
          {data.questions.map((question) => (
            <div key={question.id} className="space-y-1">
              <p className="text-ui-base font-medium leading-5 text-foreground">
                {question.question}
              </p>
              <p className="text-ui-base leading-5 text-foreground-subtle">
                {getAskUserQuestionAnswerText(question, answers, noAnswerText)}
              </p>
            </div>
          ))}
          {data.questions.length === 0 ? (
            <p className="text-ui-base leading-5 text-foreground-subtle">{noAnswerText}</p>
          ) : null}
        </div>
      ) : null,
    [answers, data.questions, isFailed, isRunning, noAnswerText],
  );

  return (
    <>
      <ToolLayout
        toolId={toolCall.toolId}
        icon={ASK_QUESTION_TOOL_ICON}
        showIcon={context.showIcon !== false}
        canToggle={!isRunning}
        forceOpen={false}
        autoOpen={false}
        kindLabel={intl.formatMessage({
          id: isRunning ? "chat.askQuestion.asking" : "chat.askQuestion.asked",
        })}
        sourceLabel={context.sourceLabel}
        primaryText={null}
        secondaryText={
          isRunning
            ? null
            : wasAutomaticallyContinued
              ? noAnswerText
              : intl.formatMessage(
                  { id: "chat.askQuestion.questionsCount" },
                  { count: String(questionCount) },
                )
        }
        statusLabel={isFailed ? statusLabel : undefined}
        statusTooltip={isFailed ? errorText : undefined}
        showFailureStatus={isFailed}
        isRunning={isRunning}
        title={toolCall.title ?? "AskUserQuestion"}
        renderContent={renderContent}
      />
      {/* <pre className="text-[8px]">{JSON.stringify(toolCall, null, 2)}</pre> */}
    </>
  );
}
