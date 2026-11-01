import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { ORIGIN_LINK_CLASS } from '../constants/note-item';
import type { OriginProps } from '../types/note-item';

/** Откуда заметка: проект, песня или этап песни */
export function Origin({ note }: OriginProps): ReactNode {
  if (!note.project) {
    return <span className="text-xs text-dim">Личная заметка</span>;
  }

  if (note.other) {
    const stage = note.expand?.other_stage;
    const task = note.expand?.project_task;

    if (stage) {
      return (
        <Link
          to="/p/$projectId/tasks/stages/$stageId"
          params={{ projectId: note.project, stageId: stage.id }}
          className={ORIGIN_LINK_CLASS}
        >
          {task?.title ?? 'Задачи'} · {stage.title}
        </Link>
      );
    }

    if (task) {
      return (
        <Link
          to="/p/$projectId/tasks/$taskId"
          params={{ projectId: note.project, taskId: task.id }}
          className={ORIGIN_LINK_CLASS}
        >
          {task.title}
        </Link>
      );
    }

    return (
      <Link
        to="/p/$projectId/tasks"
        params={{ projectId: note.project }}
        className={ORIGIN_LINK_CLASS}
      >
        Задачи
      </Link>
    );
  }

  const song = note.expand?.song;
  const stage = note.expand?.stage;

  if (note.expand?.video) {
    const video = note.expand.video;
    const videoStage = note.expand.video_stage;
    const params = {
      projectId: note.project,
      videoId: video.id,
      stageId: videoStage?.id ?? '',
    };

    return videoStage ? (
      <Link
        to="/p/$projectId/videos/$videoId/stages/$stageId"
        params={params}
        className={ORIGIN_LINK_CLASS}
      >
        {video.title} · {videoStage.title}
      </Link>
    ) : (
      <Link
        to="/p/$projectId/videos/$videoId"
        params={params}
        className={ORIGIN_LINK_CLASS}
      >
        {video.title}
      </Link>
    );
  }

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
