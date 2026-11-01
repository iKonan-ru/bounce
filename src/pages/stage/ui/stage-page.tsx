import type { ReactNode } from 'react';
import { NotesFeed } from '@/widgets/notes';
import { StageView } from '@/widgets/plan';
import { useStagePage } from '../hooks/use-stage-page';

/** Этап песни: свойства, подэтапы и заметки */
export function StagePage(): ReactNode {
  const state = useStagePage();

  return (
    <StageView {...state} notes={<NotesFeed scope={state.notesScope} />} />
  );
}
