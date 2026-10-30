import type { Post } from '@/entities/post';
import type { Project } from '@/entities/project';
import type { SongWithStages } from '@/entities/song';
import type { Task } from '@/entities/task';
import type { Video } from '@/entities/video';
import type { VideoPost } from '@/entities/video-post';
import type { Bucket } from '@/shared/types';
import type { PlanItem } from '@/widgets/plan';

/** Раздел личного плана */
export enum MyPlanView {
  /** Мои задачи и этапы */
  Tasks = 'tasks',
  /** Мои публикации */
  Content = 'content',
  /** Доступные проекты */
  Projects = 'projects',
}

/** Данные исходного проекта, общие с его страницами */
export interface MyProjectData {
  project: Project;
  songs: SongWithStages[];
  videos: Video[];
  tasks: Task[];
  posts: Post[];
  videoPosts: VideoPost[];
  isIncomplete: boolean;
  isError: boolean;
  isFetching: boolean;
}

/** Общие поля строки; id включает проект и коллекцию */
interface EntryBase {
  id: string;
  project: Project;
  due: string;
  isDone: boolean;
  canWork: boolean;
}

/** Исходная запись личного плана, без копирования задач */
export type MyPlanEntry = EntryBase &
  (
    | { kind: 'work'; item: PlanItem }
    | { kind: 'music'; post: Post; songs: SongWithStages[] }
    | { kind: 'video'; post: VideoPost; videoTitle: string }
  );

/** Строка с названием проекта */
export interface MyPlanRowProps {
  entry: MyPlanEntry;
  bucket: Bucket;
  onOpen: (id: string) => void;
}

/** Редактор исходной записи */
export interface MyPlanDialogProps {
  entry: MyPlanEntry;
  onClose: () => void;
}

/** Проект в обзоре */
export interface MyProjectRowProps {
  data: MyProjectData;
  tasksCount: number;
  postsCount: number;
}
