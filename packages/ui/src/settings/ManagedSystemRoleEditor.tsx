import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Save, Undo2, X } from "lucide-react";
import type { ISettingService, ManagedSystemRolePreset } from "@kcode/services";
import {
  TID_SETTINGS_MANAGED_SYSTEM_ROLE_ADD_PRESET,
  TID_SETTINGS_MANAGED_SYSTEM_ROLE_EDITOR,
  TID_SETTINGS_MANAGED_SYSTEM_ROLE_PRESET,
  TID_SETTINGS_MANAGED_SYSTEM_ROLE_PRESET_NAME,
  TID_SETTINGS_MANAGED_SYSTEM_ROLE_PREVIEW,
  TID_SETTINGS_MANAGED_SYSTEM_ROLE_RESTORE,
  TID_SETTINGS_MANAGED_SYSTEM_ROLE_SAVE,
  TID_SETTINGS_MANAGED_SYSTEM_ROLE_TAB_EDIT,
  TID_SETTINGS_MANAGED_SYSTEM_ROLE_TAB_PREVIEW,
} from "@kcode/shared";
import { Button } from "@/components/ui/button.js";
import { Input } from "@/components/ui/input.js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.js";
import { Textarea } from "@/components/ui/textarea.js";
import { toast } from "@/components/ui/toast.js";
import { cn } from "@/components/lib/utils.js";
import { useKCodeIntl } from "@/i18n/IntlProvider.js";
import { runUserAction, runUserActionAsync } from "@/lib/userActionTelemetry.js";
import { SettingsGroupCard } from "@/settings/SettingsPageParts.js";

type ManagedSystemRoleSettingService = Pick<
  ISettingService,
  | "readManagedSystemRoleContent"
  | "writeManagedSystemRoleContent"
  | "createManagedSystemRolePreset"
  | "deleteManagedSystemRolePreset"
>;

const EDITOR_SURFACE_CLASS =
  "h-80 max-h-80 min-h-80 w-full overflow-y-auto rounded-md border border-border bg-surface px-3 py-2 font-mono text-ui-base [field-sizing:fixed] [overflow-wrap:anywhere]";

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

export function ManagedSystemRoleEditor({
  ready,
  settingService,
}: {
  ready: boolean;
  settingService: ManagedSystemRoleSettingService;
}) {
  const { intl } = useKCodeIntl();
  const [draft, setDraft] = useState("");
  const [saved, setSaved] = useState("");
  const [template, setTemplate] = useState("");
  const [presets, setPresets] = useState<ManagedSystemRolePreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addingPreset, setAddingPreset] = useState(false);
  const [presetName, setPresetName] = useState("");
  const loadVersionRef = useRef(0);
  const dirty = draft !== saved;
  const selectedPresetId = useMemo(
    () => presets.find((preset) => preset.content === draft)?.id ?? null,
    [draft, presets],
  );

  const load = useCallback(async () => {
    if (!ready) return;
    const version = loadVersionRef.current + 1;
    loadVersionRef.current = version;
    setLoading(true);
    try {
      const result = await settingService.readManagedSystemRoleContent();
      if (loadVersionRef.current !== version) return;
      setDraft(result.content);
      setSaved(result.content);
      setTemplate(result.template);
      setPresets([...result.presets]);
    } catch (error) {
      if (loadVersionRef.current !== version) return;
      toast(intl.formatMessage({ id: "settings.managedSystemRole.loadFailed" }));
      throw error;
    } finally {
      if (loadVersionRef.current === version) {
        setLoading(false);
      }
    }
  }, [intl, ready, settingService]);

  useEffect(() => {
    if (!ready) {
      setLoading(true);
      return;
    }
    void load().catch(() => undefined);
  }, [load, ready]);

  const handleSave = useCallback(async () => {
    if (!dirty || saving || loading) return;
    setSaving(true);
    try {
      await settingService.writeManagedSystemRoleContent(draft);
      setSaved(draft);
      toast(intl.formatMessage({ id: "settings.managedSystemRole.savedHint" }));
    } catch (error) {
      toast(intl.formatMessage({ id: "settings.managedSystemRole.saveFailed" }));
      throw error;
    } finally {
      setSaving(false);
    }
  }, [dirty, draft, intl, loading, saving, settingService]);

  const handleRestore = useCallback(() => {
    if (!template) return;
    setDraft(template);
  }, [template]);

  const handleApplyPreset = useCallback(
    (preset: ManagedSystemRolePreset) => {
      if (preset.content === draft) return;
      setDraft(preset.content);
    },
    [draft],
  );

  const handleCreatePreset = useCallback(async () => {
    const name = presetName.trim();
    if (!name || saving || loading || !ready) return;
    setSaving(true);
    try {
      const created = await settingService.createManagedSystemRolePreset({
        name,
        content: draft,
      });
      setPresets((current) => [...current.filter((preset) => preset.id !== created.id), created]);
      setPresetName("");
      setAddingPreset(false);
      toast(intl.formatMessage({ id: "settings.managedSystemRole.preset.added" }));
    } catch (error) {
      toast(intl.formatMessage({ id: "settings.managedSystemRole.preset.addFailed" }));
      throw error;
    } finally {
      setSaving(false);
    }
  }, [draft, intl, loading, presetName, ready, saving, settingService]);

  const handleDeletePreset = useCallback(
    async (preset: ManagedSystemRolePreset) => {
      if (preset.kind !== "custom" || saving || loading || !ready) return;
      setSaving(true);
      try {
        await settingService.deleteManagedSystemRolePreset(preset.id);
        setPresets((current) => current.filter((item) => item.id !== preset.id));
      } catch (error) {
        toast(intl.formatMessage({ id: "settings.managedSystemRole.preset.deleteFailed" }));
        throw error;
      } finally {
        setSaving(false);
      }
    },
    [intl, loading, ready, saving, settingService],
  );

  return (
    <SettingsGroupCard>
      <div className="space-y-3 px-4 py-3">
        <div className="text-ui-base leading-6 text-foreground-subtle">
          {intl.formatMessage({ id: "settings.managedSystemRole.editorHint" })}
        </div>
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
                    disabled={loading || saving || !ready}
                    onClick={() => {
                      runUserAction({
                        input: {
                          featureId: "settings.memory",
                          action: "apply_managed_system_role_preset",
                          trigger: "button",
                        },
                        operation: () => handleApplyPreset(preset),
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
                      disabled={loading || saving || !ready}
                      aria-label={intl.formatMessage({
                        id: "settings.managedSystemRole.preset.delete",
                      })}
                      onClick={() => {
                        void runUserActionAsync({
                          input: {
                            featureId: "settings.memory",
                            action: "delete_managed_system_role_preset",
                            trigger: "button",
                          },
                          operation: () => handleDeletePreset(preset),
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
              disabled={loading || saving || !ready}
              onClick={() => setAddingPreset((open) => !open)}
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
                onChange={(event) => setPresetName(event.target.value)}
                placeholder={intl.formatMessage({
                  id: "settings.managedSystemRole.preset.namePlaceholder",
                })}
                disabled={loading || saving || !ready}
                className="max-w-56"
                data-testid={TID_SETTINGS_MANAGED_SYSTEM_ROLE_PRESET_NAME}
              />
              <Button
                type="button"
                variant="default"
                size="sm"
                disabled={!presetName.trim() || saving || loading || !ready}
                onClick={() => {
                  void runUserActionAsync({
                    input: {
                      featureId: "settings.memory",
                      action: "create_managed_system_role_preset",
                      trigger: "button",
                    },
                    operation: handleCreatePreset,
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
        <Tabs defaultValue="edit">
          <TabsList variant="line">
            <TabsTrigger
              value="edit"
              data-testid={TID_SETTINGS_MANAGED_SYSTEM_ROLE_TAB_EDIT}
            >
              {intl.formatMessage({ id: "settings.managedSystemRole.edit" })}
            </TabsTrigger>
            <TabsTrigger
              value="preview"
              data-testid={TID_SETTINGS_MANAGED_SYSTEM_ROLE_TAB_PREVIEW}
            >
              {intl.formatMessage({ id: "settings.managedSystemRole.preview" })}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="edit" className="pt-3">
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
                  event.preventDefault();
                  if (dirty && !saving && !loading) {
                    void runUserActionAsync({
                      input: {
                        featureId: "settings.memory",
                        action: "save_managed_system_role",
                        trigger: "keyboard",
                      },
                      operation: handleSave,
                      completed: { resultSource: "shared_settings" },
                      failureStage: "managed_system_role_save",
                    }).catch(() => undefined);
                  }
                }
              }}
              spellCheck={false}
              disabled={loading || saving || !ready}
              className={cn(EDITOR_SURFACE_CLASS, "resize-none")}
              aria-label={intl.formatMessage({ id: "settings.managedSystemRole.editorLabel" })}
              data-testid={TID_SETTINGS_MANAGED_SYSTEM_ROLE_EDITOR}
            />
          </TabsContent>
          <TabsContent value="preview" className="pt-3">
            <div
              data-testid={TID_SETTINGS_MANAGED_SYSTEM_ROLE_PREVIEW}
              className={cn(EDITOR_SURFACE_CLASS, "whitespace-pre-wrap text-foreground")}
            >
              {draft.trim().length > 0
                ? draft
                : intl.formatMessage({ id: "settings.managedSystemRole.previewEmpty" })}
            </div>
          </TabsContent>
        </Tabs>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="default"
            size="sm"
            disabled={!dirty || saving || loading || !ready}
            onClick={() => {
              void runUserActionAsync({
                input: {
                  featureId: "settings.memory",
                  action: "save_managed_system_role",
                  trigger: "button",
                },
                operation: handleSave,
                completed: { resultSource: "shared_settings" },
                failureStage: "managed_system_role_save",
              }).catch(() => undefined);
            }}
            data-testid={TID_SETTINGS_MANAGED_SYSTEM_ROLE_SAVE}
          >
            <Save className="size-4" />
            {intl.formatMessage({ id: "settings.managedSystemRole.save" })}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={loading || saving || !ready || !template || draft === template}
            onClick={() => {
              runUserAction({
                input: {
                  featureId: "settings.memory",
                  action: "restore_managed_system_role",
                  trigger: "button",
                },
                operation: handleRestore,
                completed: { resultSource: "local_commit" },
                failureStage: "managed_system_role_restore",
              });
            }}
            data-testid={TID_SETTINGS_MANAGED_SYSTEM_ROLE_RESTORE}
          >
            <Undo2 className="size-4" />
            {intl.formatMessage({ id: "settings.managedSystemRole.restore" })}
          </Button>
          {dirty ? (
            <span className="text-ui-sm text-foreground-subtle">
              {intl.formatMessage({ id: "settings.managedSystemRole.dirtyHint" })}
            </span>
          ) : null}
        </div>
      </div>
    </SettingsGroupCard>
  );
}
