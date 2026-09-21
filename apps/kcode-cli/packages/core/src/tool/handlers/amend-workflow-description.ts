// AmendWorkflow 的工具描述。
// 与 CreateWorkflow 分开成文：facade 与写作规则那一大段模型已经在 CreateWorkflow 上读过，
// 这里只说修订**特有**的几件事——什么时候用、缓存怎么命中、哪些东西省略即沿用、确认窗何时出现。

export const AMEND_WORKFLOW_TOOL_DESCRIPTION = [
  "Amend an existing dynamic-workflow run with a revised script or revised settings. Starts a NEW run that supersedes the old one and imports its finished work as a cache, so only what you changed is paid for again. Works on ANY run of this project: completed, errored, stopped — or still running.",
  "",
  "When to use:",
  "- The run errored (the script itself failed): fix the script and amend — every step that already succeeded is imported instead of being paid for twice. Never rewrite the workflow from scratch with CreateWorkflow.",
  "- The run completed but needs one more stage or a refinement: amend — added or changed steps run live, untouched ones cost nothing.",
  "- The run is STILL RUNNING and the user (or a reported item) shows the script is going wrong: amend it NOW, in one call. Do not TaskStop it first and do not wait for it to finish: this tool stops the running predecessor, waits for it to settle, imports everything that settled before the stop, and starts the revision. The earlier you amend, the less is re-paid.",
  "- The user wants the same workflow with fewer subagents at once, its subagents on another model, or another name: amend with only that field and neither `path` nor `script` (see below). On a running run this still stops it, and what it had in flight starts again in the new run.",
  "- To continue a stopped run unchanged, use ResumeWorkflowRun instead. Amending is for when the script or a setting changes.",
  "",
  "How the cache works:",
  "- Named subagents are matched by name across the two scripts; each one's asks are matched in order by byte-identical instructions. A match settles from the recorded result at zero tokens; a changed or added ask runs live. The cache stays open until a live subagent makes its first write to the workspace (or a live `world.run` executes): from that moment, cached world reads and cached asks whose subagent had read or run something would describe a workspace that no longer exists, so they run live too. Asks that only answered keep settling from the cache. Editing an ask's text is how you force it to run again; keep names stable and keep tunable constants out of ask text.",
  "",
  // 三条 bullet 说的是同一条规则（省略即沿用前驱），刻意并排、脚本在最前：模型若以为脚本必填，
  // 就会为了改一个数把几千 token 的脚本再抄一遍；两个设定分开说，又会让模型把其中一个的「省略」
  // 读成解除。完整语义在字段描述上（contracts/tools/amend-workflow.ts）。
  "What carries over — every field you omit keeps the predecessor's value:",
  "- The script: omit both `path` and `script` to keep the predecessor's script byte for byte and change only the settings below; its finished work still replays from the cache.",
  "- A parallelism limit: omit `max_concurrency` and the new run keeps the predecessor's, pass `null` to remove it, pass a number to change it (only when the user asks).",
  "- The subagents' model: omit `subagent_model` and the new run keeps the predecessor's, pass `null` to put the subagents back on the session model, pass a model id to change it (only when the user asks). ListModels lists the ids.",
  "",
  // 改脚本的两条来路，常态在前：整段脚本再流
  // 一遍正是要省掉的代价，而终态通知与 GetWorkflowRun 都已经把那个文件的路径给了模型。
  "Passing a revised script — one of the two, never both:",
  "- `path` is the usual way: the errored notification and GetWorkflowRun name the run's script file — edit it in place and pass the same path back, so a revision costs one Edit instead of a second copy of the whole script. A file whose bytes you did not change is refused (`script_unchanged`) unless the call also sets `max_concurrency` or `subagent_model`; nothing is stopped and nothing is created.",
  "- `script` is still accepted for a revision you write from scratch: the WHOLE revised script, inline, written against the same facade and rules as CreateWorkflow (phases, subagent names, gates, `return` shape). It is saved to a draft file and the result names it, so the next revision can go back to `path`. Compilation errors come back as diagnostics: fix the file the result names and call again with `path` — nothing was stopped or started.",
  "",
  "Confirmation:",
  "- A run this session started (through CreateWorkflow, a previous AmendWorkflow, or the workflows hub) is amended without a confirmation window, even while it is running. A run the user stopped, or a run another session started, asks the user first.",
  "- The result names the run that was superseded (if one was stopped) and the new run's ID. The superseded run sends no notification of its own; the new run notifies when it settles. Do not wait for it or poll it with TaskOutput.",
].join("\n");
