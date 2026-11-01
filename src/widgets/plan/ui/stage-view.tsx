import { Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { InlineTitle } from '@/features/mentions';
import {
  Section,
  Loading,
  Button,
  PageHeader,
  Columns,
  ConfirmDialog,
} from '@/shared/ui';
import type { StageViewProps } from '../types/stage-view';
import { StageFields } from './stage-fields';
import { SubstepsSection } from './substeps-section';

/** Страница этапа песни, видео или раздела Задачи: свойства, подэтапы и заметки */
export function StageView({
  projectId,
  crumbs,
  canEdit,
  canWork,
  isPending,
  stage,
  positionLabel,
  notes,
  isConfirming,
  setIsConfirming,
  isRemoving,
  handleSave,
  onTitleSave,
  onDeleteClick,
  onDeleteConfirm,
}: StageViewProps): ReactNode {
  if (isPending) {
    return <Loading className="h-40 rounded-xl" />;
  }

  if (!stage) {
    return <p className="text-led-red">Этап не найден.</p>;
  }

  const substeps = stage.substeps ?? [];
  const deleteTitle = `Удалить этап "${stage.title}"?`;
  const inlineTitle = (
    <InlineTitle
      value={stage.title}
      label="Переименовать этап"
      onSave={onTitleSave}
    />
  );
  const title = canEdit ? inlineTitle : stage.title;

  const main = (
    <div className="flex flex-col gap-8">
      <StageFields
        projectId={projectId}
        stage={stage}
        canWork={canWork}
        onSave={handleSave}
      />
      <SubstepsSection
        projectId={projectId}
        substeps={substeps}
        canWork={canWork}
        onSave={handleSave}
      />
      {canEdit && (
        <div>
          <Button
            variant="ghost"
            className="text-led-red hover:bg-led-red/10 hover:text-led-red"
            onClick={onDeleteClick}
          >
            <Trash2 data-icon="inline-start" />
            Удалить этап
          </Button>
        </div>
      )}
    </div>
  );

  const side = <Section title="Заметки">{notes}</Section>;

  return (
    <>
      <PageHeader crumbs={crumbs} title={title} meta={positionLabel} />
      <Columns main={main} side={side} />
      <ConfirmDialog
        open={isConfirming}
        onOpenChange={setIsConfirming}
        title={deleteTitle}
        description="Заметки этапа удалятся вместе с ним."
        confirmLabel="Удалить"
        isBusy={isRemoving}
        onConfirm={onDeleteConfirm}
      />
    </>
  );
}
