import type { ReactNode } from 'react';
import type {
  TaskStage,
  ProjectTask,
  ProjectTaskPatch,
} from '@/entities/project-task';
import type { User } from '@/entities/user';

export interface TaskStageRowProps {
  stage: TaskStage;
  projectId: string;
  handle: ReactNode;
  canEdit: boolean;
  people: Map<string, User>;
}

export interface ProjectTaskEditorProps {
  task: ProjectTask;
  onSave: (patch: ProjectTaskPatch) => Promise<void>;
  isSaving: boolean;
}
