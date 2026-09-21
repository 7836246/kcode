import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button.js";

export function useCodingPlanEntryGate(): {
  status: "ready" | "loading" | "error";
  label?: string;
  retry?: () => void;
} {
  return { status: "ready" };
}

/** 购买入口已下线；保留按钮壳给尚未删干净的调用方，点击不再走套餐查询门禁。 */
export function CodingPlanEntryButton({
  children,
  bypassGate: _bypassGate,
  ...props
}: ComponentProps<typeof Button> & { bypassGate?: boolean }) {
  return <Button {...props}>{children}</Button>;
}
