import { ListPlus } from 'lucide-react';
import type { ReactNode } from 'react';
import type { SongStage } from '@/entities/song';
import { Meter, MeterSize } from '@/entities/song';
import { AddRow } from '@/features/mentions';
import { GROUP_ROWS } from '@/shared/constants';
import { SectionButton, Section, SortableList } from '@/shared/ui';
import { useStagesSection } from '../hooks/use-stages-section';
import type { StagesSectionProps } from '../types/song';
import { SongStageRow } from './song-stage-row';

/** Этапы песни: индикатор, список с перетаскиванием и добавление */
export function StagesSection(props: StagesSectionProps): ReactNode {
  const { projectId, songId, stages, canEdit } = props;
  const {
    people,
    doneCount,
    totalCount,
    canAddFromTemplate,
    isAddingFromTemplate,
    isAdding,
    onFromTemplateClick,
    onStageAdd,
    onStagesReorder,
  } = useStagesSection(props);

  const hasStages = stages.length > 0;
  const isEmptyReadOnly = !canEdit && !hasStages;
  const templateIcon = <ListPlus />;
  const progressLabel = (
    <span className="text-sm text-dim tabular-nums">
      {doneCount} из {totalCount}
    </span>
  );
  const templateButton = canAddFromTemplate && (
    <SectionButton
      icon={templateIcon}
      disabled={isAddingFromTemplate}
      onClick={onFromTemplateClick}
    >
      Добавить этапы из шаблона
    </SectionButton>
  );
  const action = hasStages ? progressLabel : templateButton;

  const renderStageRow = (stage: SongStage, handle: ReactNode): ReactNode => (
    <SongStageRow
      projectId={projectId}
      songId={songId}
      stage={stage}
      handle={handle}
      canEdit={canEdit}
      people={people}
    />
  );

  return (
    <Section title="Этапы" action={action}>
      <div className={GROUP_ROWS}>
        {hasStages && (
          <div className="px-4 py-3.5">
            <Meter stages={stages} size={MeterSize.Large} />
          </div>
        )}
        {hasStages && (
          <SortableList
            items={stages}
            onReorder={onStagesReorder}
            disabled={!canEdit}
            className="divide-y divide-border/70 dark:divide-border/50"
            handleClassName="mr-1 h-12 w-6 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/row:opacity-100 focus-visible:opacity-100"
          >
            {renderStageRow}
          </SortableList>
        )}
        {canEdit && (
          <AddRow
            id="new-stage"
            label="Добавить этап"
            isBusy={isAdding}
            onAdd={onStageAdd}
          />
        )}
        {isEmptyReadOnly && (
          <p className="px-4 py-3 text-sm text-dim">Этапов нет</p>
        )}
      </div>
    </Section>
  );
}
