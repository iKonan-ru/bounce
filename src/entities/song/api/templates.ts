import {
  applyOptimisticEdit,
  Collections,
  getCollection,
  pb,
  queryKeys,
} from '@/shared/api';
import { QueryRoot } from '@/shared/types';
import type { QueryClient } from '@tanstack/react-query';
import type { StageTemplate, TemplateSubstep } from '../types/song';

/** Подэтапы меняются в своем направлении и откатываются при отказе сервера */
export async function updateTemplateSubsteps(
  client: QueryClient,
  template: Pick<StageTemplate, 'id' | 'project' | 'direction'>,
  substeps: TemplateSubstep[]
): Promise<void> {
  const key = queryKeys.stageTemplates.ofProject(
    template.project,
    template.direction
  );
  await applyOptimisticEdit(
    client,
    QueryRoot.StageTemplates,
    () =>
      client.setQueryData<StageTemplate[]>(key, (list) =>
        list?.map((item) =>
          item.id === template.id ? { ...item, substeps } : item
        )
      ),
    () =>
      getCollection(pb, Collections.StageTemplates).update(template.id, {
        substeps,
      })
  );
}
