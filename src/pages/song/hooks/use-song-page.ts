import { useAccess } from '@/entities/project';
import type { Song } from '@/entities/song';
import { songQuery } from '@/entities/song';
import { sendRecordForm, Collections, queryKeys } from '@/shared/api';
import { useMe, useFileUrl, useImageUpload } from '@/shared/hooks';
import { warmImages } from '@/shared/utils';
import { useProjectCrumbs } from '@/widgets/page-crumbs';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import {
  COVERS_APPEND_FIELD,
  COVER_THUMB_LARGE,
  COVER_THUMB_SMALL,
} from '../constants/song';
import type { UseSongPageResult } from '../types/song';

/** Песня, права и загрузка обложки из шапки */
export function useSongPage(): UseSongPageResult {
  const { projectId, songId } = useParams({
    from: '/app/p/$projectId/songs/$songId',
  });
  const song = useQuery(songQuery(songId));
  const crumbs = useProjectCrumbs(projectId);
  const access = useAccess(projectId);
  const me = useMe();
  const client = useQueryClient();
  const fileUrl = useFileUrl();
  // нажатие на пустую обложку в шапке - загрузка первой обложки
  const cover = useImageUpload(async (file, onProgress) => {
    const form = new FormData();
    form.append(COVERS_APPEND_FIELD, file);
    const next = await sendRecordForm<Song>(Collections.Songs, form, {
      id: songId,
      onProgress,
    });
    const added = next.covers.at(-1);
    await warmImages([
      fileUrl(next, added, COVER_THUMB_LARGE),
      fileUrl(next, added, COVER_THUMB_SMALL),
    ]);
    await client.invalidateQueries({ queryKey: queryKeys.songs.all });
  }, 'Обложка не загрузилась: проверьте соединение');

  return {
    projectId,
    songId,
    crumbs,
    canEdit: access.canEdit,
    canWork: access.canWork,
    meId: me?.id,
    isPending: song.isPending,
    song: song.data,
    notesScope: { project: projectId, song: songId },
    onCoverPick: cover.pick,
    coverPending: cover.pending,
  };
}
