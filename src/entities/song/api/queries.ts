import {
  queryKeys,
  getCollection,
  pb,
  Collections,
  getProjectFilter,
} from '@/shared/api';
import { queryOptions } from '@tanstack/react-query';
import { SONG_EXPAND } from '../constants/queries';
import type { SongWithStages, StageTemplate } from '../types/song';

/** Песни проекта с этапами, по ручному порядку */
export function songsQuery(projectId: string) {
  return queryOptions({
    queryKey: queryKeys.songs.ofProject(projectId),
    queryFn: () =>
      getCollection(pb, Collections.Songs).getFullList<SongWithStages>({
        filter: getProjectFilter(projectId),
        sort: 'position,-created',
        expand: SONG_EXPAND,
      }),
  });
}

/** Песня с этапами */
export function songQuery(id: string) {
  return queryOptions({
    queryKey: queryKeys.songs.one(id),
    queryFn: () =>
      getCollection(pb, Collections.Songs).getOne<SongWithStages>(id, {
        expand: SONG_EXPAND,
      }),
  });
}

/** Шаблон этапов проекта */
export function templatesQuery(projectId: string) {
  return queryOptions({
    queryKey: queryKeys.stageTemplates.ofProject(projectId),
    queryFn: () =>
      getCollection(pb, Collections.StageTemplates).getFullList<StageTemplate>({
        filter: getProjectFilter(projectId),
        sort: 'position',
      }),
  });
}
