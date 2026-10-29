import { Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useSongCrumbs } from '@/components/crumbs';
import { InlineTitle } from '@/components/inline-title';
import { NotesFeed } from '@/components/notes/notes-feed';
import { PeoplePicker } from '@/components/people-picker';
import { StageStatusPicker } from '@/components/stage-status';
import { SubstepsEditor } from '@/components/substeps';
import { useAccess } from '@/lib/access';
import type { Substep, SongStage, StageStatus } from '@/lib/model';
import { getOrderedStages } from '@/lib/model';
import { songQuery } from '@/lib/queries';
import type { StagePatch } from '@/lib/stages';
import { updateStage } from '@/lib/stages';
import { CLOSED_STAGE_STATUSES } from '@/lib/statuses';
import { getCollection, pb, Collections, queryKeys } from '@/shared/api';
import { GROUP_ROWS, SAVE_FAILED } from '@/shared/constants';
import type { Crumb, NoteScope } from '@/shared/types';
import {
  PropRow,
  DateField,
  Section,
  Loading,
  Button,
  PageHeader,
  Columns,
  ConfirmDialog,
} from '@/shared/ui';
import { checkIsOverdue } from '@/shared/utils';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useNavigate } from '@tanstack/react-router';

/** Подэтап из редактора: отметки "сделано" может не быть */
interface EditedSubstep {
  id: string;
  title: string;
  done?: boolean;
}

/** Подэтап из редактора в виде для записи этапа */
function convertToSubstep(item: EditedSubstep): Substep {
  return { id: item.id, title: item.title, done: item.done === true };
}

/** Срок этапа прошёл, а этап не закрыт */
function checkIsStageLate(
  stage: Pick<SongStage, 'deadline' | 'status'>
): boolean {
  if (!stage.deadline) {
    return false;
  }

  if (CLOSED_STAGE_STATUSES.has(stage.status)) {
    return false;
  }

  return checkIsOverdue(stage.deadline);
}

/** Пропсы свойств этапа */
interface StageFieldsProps {
  projectId: string;
  stage: SongStage;
  canWork: boolean;
  onSave: (patch: StagePatch) => void;
}

/** Значения и обработчики свойств этапа */
interface UseStageFieldsResult {
  assignees: string[];
  deadline: string;
  isLate: boolean;
  onStatusChange: (status: StageStatus) => void;
  onAssigneesChange: (ids: string[]) => void;
  onDeadlineChange: (day: string) => void;
}

/** Правка статуса, исполнителей и срока этапа */
function useStageFields(
  stage: SongStage,
  onSave: StageFieldsProps['onSave']
): UseStageFieldsResult {
  const onStatusChange = (status: StageStatus): void => {
    onSave({ status });
  };

  const onAssigneesChange = (ids: string[]): void => {
    onSave({ assignees: ids });
  };

  const onDeadlineChange = (day: string): void => {
    onSave({ deadline: day });
  };

  return {
    assignees: stage.assignees ?? [],
    deadline: stage.deadline ?? '',
    isLate: checkIsStageLate(stage),
    onStatusChange,
    onAssigneesChange,
    onDeadlineChange,
  };
}

/** Свойства этапа: статус, исполнители и срок */
function StageFields({
  projectId,
  stage,
  canWork,
  onSave,
}: StageFieldsProps): ReactNode {
  const {
    assignees,
    deadline,
    isLate,
    onStatusChange,
    onAssigneesChange,
    onDeadlineChange,
  } = useStageFields(stage, onSave);

  return (
    <div className={GROUP_ROWS}>
      <PropRow label="Статус">
        <StageStatusPicker
          value={stage.status}
          readOnly={!canWork}
          onChange={onStatusChange}
        />
      </PropRow>
      <PropRow label="Кто делает">
        <PeoplePicker
          projectId={projectId}
          value={assignees}
          disabled={!canWork}
          onChange={onAssigneesChange}
        />
      </PropRow>
      <PropRow label="Срок">
        <DateField
          isQuiet
          disabled={!canWork}
          value={deadline}
          isOverdue={isLate}
          placeholder="Без срока"
          onChange={onDeadlineChange}
        />
      </PropRow>
    </div>
  );
}

/** Пропсы секции подэтапов */
interface SubstepsSectionProps {
  projectId: string;
  substeps: Substep[];
  canWork: boolean;
  onSave: (patch: StagePatch) => void;
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

/** Состояние и действия страницы этапа */
interface UseStagePageResult {
  projectId: string;
  crumbs: Crumb[];
  canEdit: boolean;
  canWork: boolean;
  isPending: boolean;
  /** Этап; undefined - нет такого этапа у песни */
  stage: SongStage | undefined;
  /** Подпись места этапа в песне: "Этап 2 из 5" */
  positionLabel: string;
  notesScope: NoteScope;
  isConfirming: boolean;
  setIsConfirming: (isConfirming: boolean) => void;
  isRemoving: boolean;
  handleSave: (patch: StagePatch) => void;
  onTitleSave: (title: string) => void;
  onDeleteClick: () => void;
  onDeleteConfirm: () => void;
}

/** Этап песни, его правка и удаление */
function useStagePage(): UseStagePageResult {
  const { projectId, songId, stageId } = useParams({
    from: '/app/p/$projectId/songs/$songId/stages/$stageId',
  });
  const client = useQueryClient();
  const navigate = useNavigate();
  const song = useQuery(songQuery(songId));
  const crumbs = useSongCrumbs(projectId, songId);
  const access = useAccess(projectId);
  const [isConfirming, setIsConfirming] = useState(false);
  const stages = song.data ? getOrderedStages(song.data) : [];
  const index = stages.findIndex((songStage) => songStage.id === stageId);
  const position = index + 1;

  const handleSave = (patch: StagePatch): void => {
    void updateStage(client, songId, stageId, patch).catch(() => {
      toast.error(SAVE_FAILED);
    });
  };

  const remove = useMutation({
    mutationFn: (): Promise<boolean> =>
      getCollection(pb, Collections.SongStages).delete(stageId),
    onSuccess: async () => {
      setIsConfirming(false);
      await navigate({
        to: '/p/$projectId/songs/$songId',
        params: { projectId, songId },
      });
      await client.invalidateQueries({ queryKey: queryKeys.songs.all });
    },
    onError: () => {
      toast.error('Этап не удалён: проверьте соединение');
    },
  });

  const onTitleSave = (title: string): void => {
    handleSave({ title });
  };

  const onDeleteClick = (): void => {
    setIsConfirming(true);
  };

  const onDeleteConfirm = (): void => {
    remove.mutate();
  };

  return {
    projectId,
    crumbs,
    canEdit: access.canEdit,
    canWork: access.canWork,
    isPending: song.isPending,
    stage: stages[index],
    positionLabel: `Этап ${position} из ${stages.length}`,
    notesScope: { project: projectId, song: songId, stage: stageId },
    isConfirming,
    setIsConfirming,
    isRemoving: remove.isPending,
    handleSave,
    onTitleSave,
    onDeleteClick,
    onDeleteConfirm,
  };
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
