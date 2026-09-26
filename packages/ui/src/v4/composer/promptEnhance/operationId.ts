/**
 * 每次增强请求的取消句柄。
 *
 * Host 收不到 Renderer 的 AbortSignal：RPC 实参按 JSON 序列化，AbortSignal 没有可枚举字段，
 * 到服务侧只剩 `{}`，读 `signal.addEventListener` 直接报错。所以取消改走可序列化的
 * operationId：发起时随请求带上，取消时按同一个 id 发控制面请求。
 *
 * 纯函数（只用 globalThis.crypto），可单测。
 */
export function createPromptEnhanceOperationId(): string {
  const randomId = globalThis.crypto?.randomUUID?.();
  if (randomId) {
    return `prompt-enhance-${randomId}`;
  }
  // 非安全上下文等拿不到 randomUUID 时退化为时间戳 + 随机后缀：只要求进程内唯一。
  return `prompt-enhance-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
