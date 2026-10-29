import { Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Substep } from '@/entities/song';
import { InlineTitle } from '@/features/mentions';
import {
  Section,
  Loading,
  Button,
  PageHeader,
  Columns,
  ConfirmDialog,
} from '@/shared/ui';
import { NotesFeed } from '@/widgets/notes';
import { SubstepsEditor } from '@/widgets/plan';
import { useStagePage } from '../hooks/use-stage-page';
import type { EditedSubstep, SubstepsSectionProps } from '../types/stage';
import { StageFields } from './stage-fields';

/** Подэтап из редактора в виде для записи этапа */
function convertToSubstep(item: EditedSubstep): Substep {
  return { id: item.id, title: item.title, done: item.done === true };
}

/** Подэтапы этапа: сколько сделано и чек-лист */
function SubstepsSection({
  projectId,
  substeps,
  canWork,
  onSave,
}: SubstepsSectionProps): ReactNode {
  const hasSubsteps = substeps.length > 0;
  const doneCount = substeps.filter((substep) => substep.done).length;
  const progress = hasSubsteps && (
    <span className="text-sm text-dim tabular-nums">
      {doneCount} из {substeps.length}
    </span>
  );

  const onSubstepsChange = (items: EditedSubstep[]): void => {
    onSave({ substeps: items.map(convertToSubstep) });
  };

  return (
    <Section title="Подэтапы" action={progress}>
      <SubstepsEditor
        idPrefix="substep"
        projectId={projectId}
        isCheckable
        readOnly={!canWork}
        items={substeps}
        onChange={onSubstepsChange}
      />
    </Section>
  );
}

/** Этап песни: свойства, подэтапы и заметки */
export function StagePage(): ReactNode {
  const {
    projectId,
    crumbs,
    canEdit,
    canWork,
    isPending,
    stage,
    positionLabel,
    notesScope,
    isConfirming,
    setIsConfirming,
    isRemoving,
    handleSave,
    onTitleSave,
    onDeleteClick,
    onDeleteConfirm,
  } = useStagePage();

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
            className="-ml-3.5 text-led-red hover:bg-led-red/10 hover:text-led-red"
            onClick={onDeleteClick}
          >
            <Trash2 data-icon="inline-start" />
            Удалить этап
          </Button>
        </div>
      )}
    </div>
  );

  const side = (
    <Section title="Заметки">
      <NotesFeed scope={notesScope} />
    </Section>
  );

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
