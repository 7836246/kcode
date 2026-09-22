import { useCallback } from "react";
import { TID_V4_RETRY_SUBSCRIBE } from "@kcode/shared";
import { Button } from "@/components/ui/button.js";
import { toast } from "@/components/ui/toast.js";
import { usePlatform } from "@/hooks/usePlatform.js";
import { useKCodeIntl } from "@/i18n/IntlProvider.js";
import { openKCodeGitHubIssue } from "@/lib/productIssues.js";

interface SessionSubscriptionErrorPanelProps {
  error: string;
  sessionId: string;
  workspacePath: string;
  onReconnect: () => void;
}

export function SessionSubscriptionErrorPanel({
  error,
  onReconnect,
}: SessionSubscriptionErrorPanelProps) {
  const { intl } = useKCodeIntl();
  const platform = usePlatform();
  const handleOpenFeedback = useCallback(async () => {
    await openKCodeGitHubIssue(platform);
    toast(intl.formatMessage({ id: "chat.error.feedbackOpened" }));
  }, [intl, platform]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-4 text-ui-base">
      <p className="max-w-full break-words text-center font-mono text-destructive">{error}</p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button type="button" variant="outline" onClick={handleOpenFeedback}>
          {intl.formatMessage({ id: "chat.error.feedback" })}
        </Button>
        <Button type="button" data-testid={TID_V4_RETRY_SUBSCRIBE} onClick={onReconnect}>
          {intl.formatMessage({ id: "workspaceSidebar.reconnect" })}
        </Button>
      </div>
    </div>
  );
}
