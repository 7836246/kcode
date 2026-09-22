import { useEffect, useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import { CheckIcon, PlusIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button.js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.js";
import { cn } from "@/components/lib/utils.js";
import { thoughtLevelLabelId } from "@/chat-input-toolbar/thoughtLevelLabels.js";
import { useKCodeIntl } from "@/i18n/IntlProvider.js";
import { isImeComposingKeyEvent } from "@/lib/imeComposition.js";
import { TECHNICAL_INPUT_ATTRIBUTES } from "@/lib/technicalInputAttributes.js";
import { modelEditorControlStyle } from "@/settings/model-provider-section/modelEditorControlStyle.js";
import {
  matchingReasoningPreset,
  REASONING_LEVEL_CATALOG,
  REASONING_LEVEL_PRESETS,
  type ReasoningLevelPresetId,
} from "@/settings/model-provider-section/reasoningLevelCatalog.js";

export function ProviderModelReasoningLevelEditor({
  values,
  overridden,
  addLabel,
  deleteLabel,
  onChange,
}: {
  values: readonly string[];
  overridden: boolean;
  addLabel: string;
  deleteLabel: string;
  onChange: (values: readonly string[]) => void;
}) {
  const { intl } = useKCodeIntl();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const compositionActiveRef = useRef(false);
  const customPendingRef = useRef(false);
  const selectedPreset = matchingReasoningPreset(values);

  useEffect(() => {
    if (editingIndex !== null) inputRef.current?.focus();
  }, [editingIndex]);

  const levelLabel = (value: string) => {
    const labelId = thoughtLevelLabelId(value);
    return labelId ? intl.formatMessage({ id: labelId }) : value;
  };
  const beginEdit = (index: number, value = values[index] ?? "") => {
    setEditingIndex(index);
    setEditingValue(value);
  };
  const cancelEdit = () => {
    setEditingIndex(null);
    setEditingValue("");
  };
  const commitEdit = () => {
    if (editingIndex === null) return;
    const nextValue = editingValue.trim();
    if (!nextValue) {
      cancelEdit();
      return;
    }
    if (values.some((value, index) => index !== editingIndex && value === nextValue)) return;
    if (editingIndex < values.length && nextValue === values[editingIndex]) {
      cancelEdit();
      return;
    }
    const next = [...values];
    if (editingIndex === values.length) next.push(nextValue);
    else next[editingIndex] = nextValue;
    onChange(next);
    cancelEdit();
  };
  const move = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= values.length || to >= values.length) return;
    const next = [...values];
    const [value] = next.splice(from, 1);
    next.splice(to, 0, value!);
    onChange(next);
  };
  const handleChipKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.altKey && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
      event.preventDefault();
      move(index, event.key === "ArrowLeft" ? index - 1 : index + 1);
      return;
    }
    if ((event.key === "Enter" || event.key === " ") && !thoughtLevelLabelId(values[index] ?? "")) {
      event.preventDefault();
      beginEdit(index);
    }
  };
  const handleEditKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (
      isImeComposingKeyEvent({
        compositionActive: compositionActiveRef.current,
        nativeEvent: event.nativeEvent,
      })
    ) {
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      commitEdit();
    } else if (event.key === "Escape") {
      event.preventDefault();
      cancelEdit();
    }
  };
  const handleDrop = (event: DragEvent<HTMLDivElement>, targetIndex: number) => {
    event.preventDefault();
    if (draggingIndex !== null) move(draggingIndex, targetIndex);
    setDraggingIndex(null);
  };
  const applyPreset = (id: ReasoningLevelPresetId, presetValues: readonly string[]) => {
    if (selectedPreset === id) return;
    onChange(presetValues);
  };
  const inputClassName = cn(
    "h-8 field-sizing-content min-w-10 max-w-32 rounded-lg border px-2 text-ui-base text-foreground",
    modelEditorControlStyle(false),
  );

  return (
    <div className="space-y-2" data-model-reasoning-level-editor="true">
      <div className="flex flex-wrap items-center gap-1.5" data-personal-override={overridden}>
        {values.map((value, index) => {
          const label = levelLabel(value);
          return (
            <div
              key={`${value}-${index}`}
              data-model-reasoning-chip="true"
              data-reasoning-level-value={value}
              data-personal-override={overridden}
              draggable={editingIndex !== index}
              onDragStart={(event) => {
                setDraggingIndex(index);
                event.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => handleDrop(event, index)}
              onDragEnd={() => setDraggingIndex(null)}
              className={cn(
                "group box-border inline-flex h-8 select-none items-center rounded-lg border focus-within:bg-hover",
                modelEditorControlStyle(overridden, false),
                draggingIndex === index && "opacity-60",
              )}
            >
              {editingIndex === index ? (
                <input
                  {...TECHNICAL_INPUT_ATTRIBUTES}
                  ref={inputRef}
                  value={editingValue}
                  className="h-8 field-sizing-content min-w-10 max-w-32 border-0 bg-transparent px-2 text-ui-base text-foreground outline-none"
                  data-model-reasoning-level-input="true"
                  onChange={(event) => setEditingValue(event.target.value)}
                  onBlur={commitEdit}
                  onCompositionStart={() => {
                    compositionActiveRef.current = true;
                  }}
                  onCompositionEnd={() => {
                    compositionActiveRef.current = false;
                  }}
                  onKeyDown={handleEditKeyDown}
                />
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  title={label === value ? undefined : value}
                  aria-label={label === value ? undefined : `${label} ${value}`}
                  className="min-w-10 shrink cursor-grab rounded-lg border-0 bg-transparent px-2 active:cursor-grabbing hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0"
                  onClick={() => {
                    if (!thoughtLevelLabelId(value)) beginEdit(index);
                  }}
                  onKeyDown={(event) => handleChipKeyDown(event, index)}
                >
                  {label}
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="mr-0.5 size-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 disabled:opacity-0"
                aria-label={`${deleteLabel}: ${label}`}
                disabled={values.length <= 1}
                onClick={() => onChange(values.filter((_, valueIndex) => valueIndex !== index))}
              >
                <XIcon className="size-3.5" aria-hidden="true" />
              </Button>
            </div>
          );
        })}
        {editingIndex === values.length ? (
          <input
            {...TECHNICAL_INPUT_ATTRIBUTES}
            ref={inputRef}
            value={editingValue}
            className={inputClassName}
            data-model-reasoning-level-input="true"
            aria-label={intl.formatMessage({ id: "settings.modelProvider.reasoningLevelCustom" })}
            onChange={(event) => setEditingValue(event.target.value)}
            onBlur={commitEdit}
            onCompositionStart={() => {
              compositionActiveRef.current = true;
            }}
            onCompositionEnd={() => {
              compositionActiveRef.current = false;
            }}
            onKeyDown={handleEditKeyDown}
          />
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon-lg"
                data-model-reasoning-level-add="true"
                className={modelEditorControlStyle(false, false)}
                aria-label={addLabel}
              >
                <PlusIcon className="size-3.5" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="min-w-44"
              onCloseAutoFocus={(event) => {
                // 选「其他」后焦点要留在新输入框，不能被菜单交还给已经卸下的加号按钮。
                if (!customPendingRef.current) return;
                customPendingRef.current = false;
                event.preventDefault();
              }}
            >
              {REASONING_LEVEL_CATALOG.map((level) => {
                const included = values.includes(level);
                return (
                  <DropdownMenuItem
                    key={level}
                    disabled={included}
                    data-reasoning-level-option={level}
                    onSelect={() => onChange([...values, level])}
                  >
                    <span className="flex-1">{levelLabel(level)}</span>
                    <span className="font-mono text-ui-sm text-foreground-subtlest">{level}</span>
                    {included ? <CheckIcon className="size-3.5" aria-hidden="true" /> : null}
                  </DropdownMenuItem>
                );
              })}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                data-reasoning-level-custom="true"
                onSelect={() => {
                  customPendingRef.current = true;
                  beginEdit(values.length);
                }}
              >
                {intl.formatMessage({ id: "settings.modelProvider.reasoningLevelCustom" })}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <div
        className="flex flex-wrap gap-1.5"
        role="group"
        aria-label={intl.formatMessage({ id: "settings.modelProvider.reasoningLevelPresetGroup" })}
      >
        {REASONING_LEVEL_PRESETS.map((preset) => {
          const selected = selectedPreset === preset.id;
          return (
            <Button
              key={preset.id}
              type="button"
              variant="outline"
              size="sm"
              aria-pressed={selected}
              data-reasoning-preset={preset.id}
              data-selected={selected}
              className={modelEditorControlStyle(false, selected)}
              onClick={() => applyPreset(preset.id, preset.values)}
            >
              {intl.formatMessage({
                id: `settings.modelProvider.reasoningLevelPreset.${preset.id}`,
              })}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
