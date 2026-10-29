import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { ORIGIN_LINK_CLASS } from '../constants/note-item';
import type { OriginProps } from '../types/note-item';

/** Откуда заметка: проект, песня или этап песни */
export function Origin({ note }: OriginProps): ReactNode {
  const song = note.expand?.song;
  const stage = note.expand?.stage;

  if (!song) {
    const projectParams = { projectId: note.project };

    return (
      <Link
        to="/p/$projectId"
        params={projectParams}
        className={ORIGIN_LINK_CLASS}
      >
        Проект
      </Link>
    );
  }

  if (!stage) {
    const songParams = { projectId: note.project, songId: song.id };

    return (
      <Link
        to="/p/$projectId/songs/$songId"
        params={songParams}
        className={ORIGIN_LINK_CLASS}
      >
        {song.title}
      </Link>
    );
  }

  const stageParams = {
    projectId: note.project,
    songId: song.id,
    stageId: stage.id,
  };

  return (
    <Link
      to="/p/$projectId/songs/$songId/stages/$stageId"
      params={stageParams}
      className={ORIGIN_LINK_CLASS}
    >
      {song.title} · {stage.title}
    </Link>
  );
}
