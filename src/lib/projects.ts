import type PocketBase from 'pocketbase';
import type { Project } from './model';
import { collection } from './pb';

export type NewProject = { name: string; owner: string; members?: string[] };

// Новый проект пустой: шаблон этапов заполняется в его настройках.
export function createProject(client: PocketBase, input: NewProject): Promise<Project> {
  return collection(client, 'projects').create<Project>({
    name: input.name.trim(),
    owner: input.owner,
    members: (input.members ?? []).filter((m) => m !== input.owner),
  });
}
