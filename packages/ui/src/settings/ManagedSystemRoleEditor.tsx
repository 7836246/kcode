import { useCallback, useEffect, useRef, useState } from "react";
import { Save, Undo2 } from "lucide-react";
import type { ISettingService, ManagedSystemRolePreset } from "@kcode/services";
import {
  TID_SETTINGS_MANAGED_SYSTEM_ROLE_EDITOR,
  TID_SETTINGS_MANAGED_SYSTEM_ROLE_PREVIEW,
  TID_SETTINGS_MANAGED_SYSTEM_ROLE_RESTORE,
  TID_SETTINGS_MANAGED_SYSTEM_ROLE_SAVE,
  TID_SETTINGS_MANAGED_SYSTEM_ROLE_TAB_EDIT,
  TID_SETTINGS_MANAGED_SYSTEM_ROLE_TAB_PREVIEW,
  TID_SETTINGS_MANAGED_SYSTEM_ROLE_UPDATE_PRESET,
} from "@kcode/shared";
import { Button } from "@/components/ui/button.js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.js";
import { Textarea } from "@/components/ui/textarea.js";
import { toast } from "@/components/ui/toast.js";
import { cn } from "@/components/lib/utils.js";
import { useKCodeIntl } from "@/i18n/IntlProvider.js";
import { runUserAction, runUserActionAsync } from "@/lib/userActionTelemetry.js";
import { SettingsGroupCard } from "@/settings/SettingsPageParts.js";
import {
  ManagedSystemRoleDiscardDialog,
  ManagedSystemRolePresetToolbar,
} from "@/settings/ManagedSystemRolePresetToolbar.js";

type ManagedSystemRoleSettingService = Pick<
  ISettingService,
  | "readManagedSystemRoleContent"
  | "writeManagedSystemRoleContent"
    | "createManagedSystemRolePreset"
    | "updateManagedSystemRolePreset"
    | "deleteManagedSystemRolePreset"
>;

const EDITOR_SURFACE_CLASS =
  "h-80 max-h-80 min-h-80 w-full overflow-y-auto rounded-md border border-border bg-surface px-3 py-2 font-mono text-ui-base [field-sizing:fixed] [overflow-wrap:anywhere]";

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
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [pendingSwitch, setPendingSwitch] = useState<
    { kind: "preset"; preset: ManagedSystemRolePreset } | { kind: "restore" } | null
  >(null);
  const loadVersionRef = useRef(0);
  const dirty = draft !== saved;
  const selectedPreset = presets.find((preset) => preset.id === selectedPresetId) ?? null;
  const selectedCustomDirty =
    selectedPreset?.kind === "custom" && selectedPreset.content !== draft;

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
      setSelectedPresetId(result.presetId);
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
      await settingService.writeManagedSystemRoleContent(draft, {
        presetId: selectedPresetId,
      });
      setSaved(draft);
      toast(intl.formatMessage({ id: "settings.managedSystemRole.savedHint" }));
    } catch (error) {
      toast(intl.formatMessage({ id: "settings.managedSystemRole.saveFailed" }));
      throw error;
    } finally {
      setSaving(false);
    }
  }, [dirty, draft, intl, loading, saving, selectedPresetId, settingService]);

  const applyDraft = useCallback((nextDraft: string, nextPresetId: string | null) => {
    setDraft(nextDraft);
    setSelectedPresetId(nextPresetId);
  }, []);

  const handleRestore = useCallback(() => {
    if (!template) return;
    if (dirty && draft !== template) {
      setPendingSwitch({ kind: "restore" });
      return;
    }
    applyDraft(template, "default");
  }, [applyDraft, dirty, draft, template]);

  const handleApplyPreset = useCallback(
    (preset: ManagedSystemRolePreset) => {
      if (preset.id === selectedPresetId && preset.content === draft) return;
      if (dirty && preset.content !== draft) {
        setPendingSwitch({ kind: "preset", preset });
        return;
      }
      applyDraft(preset.content, preset.id);
    },
    [applyDraft, dirty, draft, selectedPresetId],
  );

  const handleConfirmSwitch = useCallback(() => {
    if (!pendingSwitch) return;
    if (pendingSwitch.kind === "restore") {
      applyDraft(template, "default");
    } else {
      applyDraft(pendingSwitch.preset.content, pendingSwitch.preset.id);
    }
    setPendingSwitch(null);
  }, [applyDraft, pendingSwitch, template]);

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
      setSelectedPresetId(created.id);
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

  const handleUpdatePreset = useCallback(async () => {
    if (!selectedPreset || selectedPreset.kind !== "custom" || !selectedCustomDirty) return;
    if (saving || loading || !ready) return;
    setSaving(true);
    try {
      const updated = await settingService.updateManagedSystemRolePreset({
        id: selectedPreset.id,
        content: draft,
      });
      setPresets((current) =>
        current.map((preset) => (preset.id === updated.id ? updated : preset)),
      );
      toast(intl.formatMessage({ id: "settings.managedSystemRole.preset.updated" }));
    } catch (error) {
      toast(intl.formatMessage({ id: "settings.managedSystemRole.preset.updateFailed" }));
      throw error;
    } finally {
      setSaving(false);
    }
  }, [
    draft,
    intl,
    loading,
    ready,
    saving,
    selectedCustomDirty,
    selectedPreset,
    settingService,
  ]);

  const handleDeletePreset = useCallback(
    async (preset: ManagedSystemRolePreset) => {
      if (preset.kind !== "custom" || saving || loading || !ready) return;
      setSaving(true);
      try {
        await settingService.deleteManagedSystemRolePreset(preset.id);
        setPresets((current) => current.filter((item) => item.id !== preset.id));
        setSelectedPresetId((current) => (current === preset.id ? null : current));
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
        <ManagedSystemRolePresetToolbar
          addingPreset={addingPreset}
          disabled={loading || saving || !ready}
          onAdd={() => setAddingPreset((open) => !open)}
          onApply={handleApplyPreset}
          onCreate={handleCreatePreset}
          onDelete={handleDeletePreset}
          onPresetNameChange={setPresetName}
          presetName={presetName}
          presets={presets}
          selectedPresetId={selectedPresetId}
        />
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
            disabled={!selectedCustomDirty || saving || loading || !ready}
            onClick={() => {
              void runUserActionAsync({
                input: {
                  featureId: "settings.memory",
                  action: "update_managed_system_role_preset",
                  trigger: "button",
                },
                operation: handleUpdatePreset,
                completed: { resultSource: "shared_settings" },
                failureStage: "managed_system_role_preset_update",
              }).catch(() => undefined);
            }}
            data-testid={TID_SETTINGS_MANAGED_SYSTEM_ROLE_UPDATE_PRESET}
          >
            <Save className="size-4" />
            {intl.formatMessage({ id: "settings.managedSystemRole.preset.update" })}
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
      <ManagedSystemRoleDiscardDialog
        open={pendingSwitch !== null}
        onCancel={() => setPendingSwitch(null)}
        onConfirm={handleConfirmSwitch}
      />
    </SettingsGroupCard>
  );
}
