import type { Substep } from '@/entities/song';
import type { OtherStagesResponse, ProjectTasksResponse } from '@/shared/api';

export type ProjectTask = ProjectTasksResponse;

export type TaskStage = OtherStagesResponse<
  Substep[],
  { project_task?: ProjectTask }
>;

export type ProjectTaskStatus = ProjectTask['status'];

export interface ProjectTaskPatch {
  title: string;
  status: ProjectTaskStatus;
}
