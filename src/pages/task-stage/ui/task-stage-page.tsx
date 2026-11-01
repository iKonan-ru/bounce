import type { ReactNode } from 'react';
import { NotesFeed } from '@/widgets/notes';
import { StageView } from '@/widgets/plan';
import { useTaskStagePage } from '../hooks/use-task-stage-page';

/** Этап раздела Задачи: свойства, подэтапы и заметки */
export function TaskStagePage(): ReactNode {
  const state = useTaskStagePage();

  return (
    <StageView {...state} notes={<NotesFeed scope={state.notesScope} />} />
  );
}
