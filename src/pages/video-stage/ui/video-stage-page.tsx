import type { ReactNode } from 'react';
import { NotesFeed } from '@/widgets/notes';
import { StageView } from '@/widgets/plan';
import { useVideoStagePage } from '../hooks/use-video-stage-page';

/** Этап видео: свойства, подэтапы и заметки */
export function VideoStagePage(): ReactNode {
  const state = useVideoStagePage();

  return (
    <StageView {...state} notes={<NotesFeed scope={state.notesScope} />} />
  );
}
