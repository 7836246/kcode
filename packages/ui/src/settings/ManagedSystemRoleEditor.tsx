import { useCallback, useEffect, useRef, useState } from "react";
import { Save, Undo2 } from "lucide-react";
import type { ISettingService } from "@kcode/services";
import {
  TID_SETTINGS_MANAGED_SYSTEM_ROLE_EDITOR,
  TID_SETTINGS_MANAGED_SYSTEM_ROLE_PREVIEW,
  TID_SETTINGS_MANAGED_SYSTEM_ROLE_RESTORE,
  TID_SETTINGS_MANAGED_SYSTEM_ROLE_SAVE,
  TID_SETTINGS_MANAGED_SYSTEM_ROLE_TAB_EDIT,
  TID_SETTINGS_MANAGED_SYSTEM_ROLE_TAB_PREVIEW,
} from "@kcode/shared";
import { Button } from "@/components/ui/button.js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.js";
import { Textarea } from "@/components/ui/textarea.js";
import { toast } from "@/components/ui/toast.js";
import { useKCodeIntl } from "@/i18n/IntlProvider.js";
import { runUserAction, runUserActionAsync } from "@/lib/userActionTelemetry.js";
import { SettingsGroupCard } from "@/settings/SettingsPageParts.js";

type ManagedSystemRoleSettingService = Pick<
  ISettingService,
  "readManagedSystemRoleContent" | "writeManagedSystemRoleContent"
>;

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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const loadVersionRef = useRef(0);
  const dirty = draft !== saved;

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

  return (
    <SettingsGroupCard>
      <div className="space-y-3 px-4 py-3">
        <div className="text-ui-base leading-6 text-foreground-subtle">
          {intl.formatMessage({ id: "settings.managedSystemRole.editorHint" })}
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
              className="min-h-64 w-full resize-y font-mono text-ui-base"
              aria-label={intl.formatMessage({ id: "settings.managedSystemRole.editorLabel" })}
              data-testid={TID_SETTINGS_MANAGED_SYSTEM_ROLE_EDITOR}
            />
          </TabsContent>
          <TabsContent value="preview" className="pt-3">
            <div
              data-testid={TID_SETTINGS_MANAGED_SYSTEM_ROLE_PREVIEW}
              className="min-h-64 overflow-auto rounded-md border border-border bg-surface px-3 py-2 whitespace-pre-wrap font-mono text-ui-base text-foreground"
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
