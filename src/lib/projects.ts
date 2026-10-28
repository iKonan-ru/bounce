import type PocketBase from 'pocketbase';
import { DEFAULT_TEMPLATE, type TemplateStage } from './default-template';
import { newRecordId } from './id';
import type { Project } from './model';
import { collection } from './pb';

export type NewProject = { name: string; owner: string; members?: string[] };

// Проект и его шаблон этапов - одной транзакцией.
export async function createProject(
  client: PocketBase,
  input: NewProject,
  template: ReadonlyArray<TemplateStage> = DEFAULT_TEMPLATE,
): Promise<Project> {
  const id = newRecordId();
  const batch = client.createBatch();
  batch.collection('projects').create({
    id,
    name: input.name.trim(),
    owner: input.owner,
    members: (input.members ?? []).filter((m) => m !== input.owner),
  });
  template.forEach((t, i) => {
    batch.collection('stage_templates').create({
      project: id,
      title: t.title,
      position: i,
      optional: t.optional === true,
      substeps: t.substeps ?? [],
    });
  });
  await batch.send();
  return collection(client, 'projects').getOne<Project>(id);
}

export function isProjectOwner(project: Pick<Project, 'owner'>, userId: string): boolean {
  return project.owner === userId;
}
