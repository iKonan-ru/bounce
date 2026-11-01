import type { ReactNode } from 'react';
import type { ProjectTask, TaskStage } from '@/entities/project-task';

export interface ProjectTaskRowProps {
  task: ProjectTask;
  stages: TaskStage[];
  projectId: string;
  handle: ReactNode;
}
