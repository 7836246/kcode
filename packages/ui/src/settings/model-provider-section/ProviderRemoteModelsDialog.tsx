import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button.js";
import { Checkbox } from "@/components/ui/checkbox.js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.js";
import { Input } from "@/components/ui/input.js";
import { useKCodeIntl } from "@/i18n/IntlProvider.js";
import { TID_MODEL_PROVIDER_FETCH_MODELS_DIALOG } from "@kcode/shared";

export function ProviderRemoteModelsDialog({
  open,
  remoteModelIds,
  existingModelIds,
  saving = false,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  remoteModelIds: readonly string[];
  existingModelIds: ReadonlySet<string>;
  saving?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (modelIds: readonly string[]) => void | Promise<void>;
}) {
  const { intl } = useKCodeIntl();
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const existingRemoteCount = useMemo(
    () => remoteModelIds.filter((modelId) => existingModelIds.has(modelId)).length,
    [existingModelIds, remoteModelIds],
  );
  const newModelIds = useMemo(
    () => remoteModelIds.filter((modelId) => !existingModelIds.has(modelId)),
    [existingModelIds, remoteModelIds],
  );
  const visibleModelIds = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    if (!needle) return remoteModelIds;
    return remoteModelIds.filter((modelId) => modelId.toLocaleLowerCase().includes(needle));
  }, [query, remoteModelIds]);
  const visibleNewModelIds = visibleModelIds.filter((modelId) => !existingModelIds.has(modelId));
  const selectedNewCount = newModelIds.filter((modelId) => selectedIds.has(modelId)).length;

  // 每次打开或换一批远端目录都从空勾选开始，避免上次确认后残留选中项。
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setSelectedIds(new Set());
  }, [open, remoteModelIds]);

  const toggle = (modelId: string, checked: boolean) => {
    if (existingModelIds.has(modelId)) return;
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(modelId);
      else next.delete(modelId);
      return next;
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (saving) return;
        if (!nextOpen) {
          setQuery("");
          setSelectedIds(new Set());
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent
        className="max-w-lg"
        data-testid={TID_MODEL_PROVIDER_FETCH_MODELS_DIALOG}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {intl.formatMessage({ id: "settings.modelProvider.fetchModelsDialogTitle" })}
          </DialogTitle>
          <DialogDescription>
            {intl.formatMessage(
              { id: "settings.modelProvider.fetchModelsDialogDescription" },
              { total: remoteModelIds.length, added: existingRemoteCount },
            )}
          </DialogDescription>
        </DialogHeader>
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={intl.formatMessage({
            id: "settings.modelProvider.fetchModelsSearchPlaceholder",
          })}
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-ui-sm text-foreground-subtle">
            {intl.formatMessage(
              { id: "settings.modelProvider.fetchModelsSelectedCount" },
              { count: selectedNewCount },
            )}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={visibleNewModelIds.length === 0}
            onClick={() => {
              const allVisibleSelected = visibleNewModelIds.every((modelId) =>
                selectedIds.has(modelId),
              );
              setSelectedIds((current) => {
                const next = new Set(current);
                for (const modelId of visibleNewModelIds) {
                  if (allVisibleSelected) next.delete(modelId);
                  else next.add(modelId);
                }
                return next;
              });
            }}
          >
            {intl.formatMessage({
              id:
                visibleNewModelIds.length > 0 &&
                visibleNewModelIds.every((modelId) => selectedIds.has(modelId))
                  ? "settings.modelProvider.fetchModelsDeselectVisible"
                  : "settings.modelProvider.fetchModelsSelectVisible",
            })}
          </Button>
        </div>
        <div className="max-h-72 overflow-y-auto rounded-lg border border-input-border">
          {visibleModelIds.length === 0 ? (
            <div className="px-3 py-6 text-ui-base text-foreground-subtle">
              {intl.formatMessage({ id: "settings.modelProvider.fetchModelsSearchEmpty" })}
            </div>
          ) : (
            visibleModelIds.map((modelId) => {
              const existing = existingModelIds.has(modelId);
              return (
                <label
                  key={modelId}
                  className="flex items-center gap-2 border-b border-border px-3 py-2 last:border-b-0"
                >
                  <Checkbox
                    checked={existing || selectedIds.has(modelId)}
                    disabled={existing || saving}
                    onCheckedChange={(checked) => toggle(modelId, checked === true)}
                  />
                  <span className="min-w-0 flex-1 truncate font-mono text-ui-base">{modelId}</span>
                  {existing ? (
                    <span className="shrink-0 text-ui-xs text-foreground-subtle">
                      {intl.formatMessage({ id: "settings.modelProvider.fetchModelsAlreadyAdded" })}
                    </span>
                  ) : null}
                </label>
              );
            })
          )}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="secondary"
            disabled={saving}
            onClick={() => onOpenChange(false)}
          >
            {intl.formatMessage({ id: "common.cancel" })}
          </Button>
          <Button
            type="button"
            disabled={saving || selectedNewCount === 0}
            onClick={() => {
              void onConfirm(newModelIds.filter((modelId) => selectedIds.has(modelId)));
            }}
          >
            {intl.formatMessage(
              { id: "settings.modelProvider.fetchModelsConfirm" },
              { count: selectedNewCount },
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
