import { ChevronRight, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { Collapse, AutosaveInput, Button, ConfirmDialog } from '@/shared/ui';
import { cn } from '@/shared/utils';
import { SubstepsEditor } from '@/widgets/plan';
import { TITLE_MAX_LENGTH } from '../constants/project-settings';
import { useTemplateRow } from '../hooks/use-template-row';
import type { TemplateRowProps } from '../types/project-settings';

/** Строка этапа шаблона: раскрывается для правки названия и подэтапов */
export function TemplateRow({
  template,
  handle,
  isOpen,
  onToggle,
}: TemplateRowProps): ReactNode {
  const {
    substeps,
    isConfirming,
    setIsConfirming,
    isRemoving,
    onToggleClick,
    onTitleSave,
    onSubstepsChange,
    onRemoveClick,
    onRemoveConfirm,
  } = useTemplateRow(template, onToggle);

  const hasSubsteps = substeps.length > 0;
  const chevronClassName = cn(
    'size-4 shrink-0 text-dim/60 transition-transform',
    {
      'rotate-90': isOpen,
    }
  );
  const titleInputId = `tpl-title-${template.id}`;
  const substepsIdPrefix = `tpl-${template.id}`;
  const confirmTitle = `Убрать "${template.title}" из шаблона?`;

  return (
    <div className="group/row">
      <div className="flex items-center pl-1 transition-colors hover:bg-groove/30">
        {handle}
        <button
          type="button"
          aria-expanded={isOpen}
          onClick={onToggleClick}
          className="flex min-h-12 min-w-0 flex-1 items-center gap-3 pr-3 text-left md:min-h-11"
        >
          <span className="min-w-0 flex-1 truncate">{template.title}</span>
          {hasSubsteps && (
            <span className="shrink-0 text-sm text-dim">
              {substeps.length} подэт.
            </span>
          )}
          <ChevronRight className={chevronClassName} />
        </button>
      </div>
      <Collapse isOpen={isOpen}>
        <div className="flex flex-col gap-3 bg-console/50 px-4 pt-2 pb-4 dark:bg-console/40">
          <div className="flex items-center gap-2">
            <span className="w-24 shrink-0 text-sm text-dim">Название</span>
            <AutosaveInput
              id={titleInputId}
              required
              maxLength={TITLE_MAX_LENGTH}
              value={template.title}
              className="text-left"
              onSave={onTitleSave}
            />
          </div>
          <SubstepsEditor
            idPrefix={substepsIdPrefix}
            isCheckable={false}
            items={substeps}
            onChange={onSubstepsChange}
          />
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="-ml-2 h-9 px-2 text-led-red hover:bg-led-red/10 hover:text-led-red"
              onClick={onRemoveClick}
            >
              <Trash2 data-icon="inline-start" />
              Убрать из шаблона
            </Button>
          </div>
        </div>
      </Collapse>
      <ConfirmDialog
        open={isConfirming}
        onOpenChange={setIsConfirming}
        title={confirmTitle}
        description="Песни, которые уже созданы, не изменятся."
        confirmLabel="Убрать"
        isBusy={isRemoving}
        onConfirm={onRemoveConfirm}
      />
    </div>
  );
}
