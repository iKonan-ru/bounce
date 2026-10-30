import type { ReactNode } from 'react';
import type { Substep } from '@/entities/song';
import { Section } from '@/shared/ui';
import type {
  EditedSubstep,
  SubstepsSectionProps,
} from '../types/stage-fields';
import { SubstepsEditor } from './substeps-editor';

/** Подэтап из редактора в виде для записи этапа */
function convertToSubstep(item: EditedSubstep): Substep {
  return { id: item.id, title: item.title, done: item.done === true };
}

/** Подэтапы этапа: сколько сделано и чек-лист */
export function SubstepsSection({
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
