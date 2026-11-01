import type { ReactNode } from 'react';
import { NotesFeed } from '@/widgets/notes';
import { StageView } from '@/widgets/plan';
import { useOtherStagePage } from '../hooks/use-other-stage-page';

/** Этап раздела Другое: свойства, подэтапы и заметки */
export function OtherStagePage(): ReactNode {
  const state = useOtherStagePage();

  return (
    <StageView {...state} notes={<NotesFeed scope={state.notesScope} />} />
  );
}
