import type { ProjectTask, TaskStage } from '@/entities/project-task';

export type ProjectTaskFilter = 'all' | ProjectTask['status'];

export interface ProjectTaskRowProps {
  task: ProjectTask;
  stages: TaskStage[];
  projectId: string;
  isOrdering?: boolean;
}
