import { Plus, X } from "lucide-react";
import type { ManagedSystemRolePreset } from "@kcode/services";
import {
  TID_SETTINGS_MANAGED_SYSTEM_ROLE_ADD_PRESET,
  TID_SETTINGS_MANAGED_SYSTEM_ROLE_DISCARD,
  TID_SETTINGS_MANAGED_SYSTEM_ROLE_PRESET,
  TID_SETTINGS_MANAGED_SYSTEM_ROLE_PRESET_NAME,
} from "@kcode/shared";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog.js";
import { Button } from "@/components/ui/button.js";
import { Input } from "@/components/ui/input.js";
import { useKCodeIntl } from "@/i18n/IntlProvider.js";
import { runUserAction, runUserActionAsync } from "@/lib/userActionTelemetry.js";

function presetLabel(
  preset: ManagedSystemRolePreset,
  formatMessage: (descriptor: { id: string }) => string,
): string {
  if (preset.id === "default") {
    return formatMessage({ id: "settings.managedSystemRole.preset.default" });
  }
  if (preset.id === "unrestricted") {
    return formatMessage({ id: "settings.managedSystemRole.preset.unrestricted" });
  }
  return preset.name;
}

export function ManagedSystemRolePresetToolbar({
  addingPreset,
  disabled,
  onAdd,
  onApply,
  onCreate,
  onDelete,
  onPresetNameChange,
  presetName,
  presets,
  selectedPresetId,
}: {
  addingPreset: boolean;
  disabled: boolean;
  onAdd: () => void;
  onApply: (preset: ManagedSystemRolePreset) => void;
  onCreate: () => Promise<void>;
  onDelete: (preset: ManagedSystemRolePreset) => Promise<void>;
  onPresetNameChange: (name: string) => void;
  presetName: string;
  presets: readonly ManagedSystemRolePreset[];
  selectedPresetId: string | null;
}) {
  const { intl } = useKCodeIntl();
  return (
    <div className="space-y-2">
      <div className="text-ui-sm text-foreground-subtle">
        {intl.formatMessage({ id: "settings.managedSystemRole.preset.label" })}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {presets.map((preset) => {
          const selected = selectedPresetId === preset.id;
          return (
            <div key={preset.id} className="flex items-center">
              <Button
                type="button"
                variant={selected ? "default" : "outline"}
                size="sm"
                disabled={disabled}
                onClick={() => {
                  runUserAction({
                    input: {
                      featureId: "settings.memory",
                      action: "apply_managed_system_role_preset",
                      trigger: "button",
                    },
                    operation: () => onApply(preset),
                    completed: { resultSource: "local_commit" },
                    failureStage: "managed_system_role_preset_apply",
                  });
                }}
                data-testid={`${TID_SETTINGS_MANAGED_SYSTEM_ROLE_PRESET}-${preset.id}`}
              >
                {presetLabel(preset, intl.formatMessage)}
              </Button>
              {preset.kind === "custom" ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="ml-0.5"
                  disabled={disabled}
                  aria-label={intl.formatMessage({
                    id: "settings.managedSystemRole.preset.delete",
                  })}
                  onClick={(event) => {
                    event.stopPropagation();
                    void runUserActionAsync({
                      input: {
                        featureId: "settings.memory",
                        action: "delete_managed_system_role_preset",
                        trigger: "button",
                      },
                      operation: () => onDelete(preset),
                      completed: { resultSource: "shared_settings" },
                      failureStage: "managed_system_role_preset_delete",
                    }).catch(() => undefined);
                  }}
                >
                  <X className="size-3" />
                </Button>
              ) : null}
            </div>
          );
        })}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={onAdd}
          data-testid={TID_SETTINGS_MANAGED_SYSTEM_ROLE_ADD_PRESET}
        >
          <Plus className="size-4" />
          {intl.formatMessage({ id: "settings.managedSystemRole.preset.add" })}
        </Button>
      </div>
      {addingPreset ? (
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={presetName}
            onChange={(event) => onPresetNameChange(event.target.value)}
            placeholder={intl.formatMessage({
              id: "settings.managedSystemRole.preset.namePlaceholder",
            })}
            disabled={disabled}
            className="max-w-56"
            data-testid={TID_SETTINGS_MANAGED_SYSTEM_ROLE_PRESET_NAME}
          />
          <Button
            type="button"
            variant="default"
            size="sm"
            disabled={!presetName.trim() || disabled}
            onClick={() => {
              void runUserActionAsync({
                input: {
                  featureId: "settings.memory",
                  action: "create_managed_system_role_preset",
                  trigger: "button",
                },
                operation: onCreate,
                completed: { resultSource: "shared_settings" },
                failureStage: "managed_system_role_preset_create",
              }).catch(() => undefined);
            }}
          >
            {intl.formatMessage({ id: "settings.managedSystemRole.preset.saveNew" })}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function ManagedSystemRoleDiscardDialog({
  onCancel,
  onConfirm,
  open,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  open: boolean;
}) {
  const { intl } = useKCodeIntl();
  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onCancel();
      }}
    >
      <AlertDialogContent data-testid={TID_SETTINGS_MANAGED_SYSTEM_ROLE_DISCARD}>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {intl.formatMessage({ id: "settings.managedSystemRole.discard.title" })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {intl.formatMessage({ id: "settings.managedSystemRole.discard.description" })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>
            {intl.formatMessage({ id: "settings.managedSystemRole.discard.cancel" })}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              runUserAction({
                input: {
                  featureId: "settings.memory",
                  action: "discard_managed_system_role_draft",
                  trigger: "button",
                },
                operation: onConfirm,
                completed: { resultSource: "local_commit" },
                failureStage: "managed_system_role_discard",
              });
            }}
          >
            {intl.formatMessage({ id: "settings.managedSystemRole.discard.confirm" })}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
