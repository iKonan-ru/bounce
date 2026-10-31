import type { Post } from '@/entities/post';
import type { Project } from '@/entities/project';
import type { SongWithStages } from '@/entities/song';
import type { Task } from '@/entities/task';
import type { Video } from '@/entities/video';
import type { VideoPost } from '@/entities/video-post';
import type { Bucket } from '@/shared/types';
import type { PlanItem } from '@/widgets/plan';

/** Фильтр плана проекта */
export enum MyPlanView {
  /** Мои задачи и этапы */
  Tasks = 'tasks',
  /** Задачи и публикации вместе */
  All = 'all',
  /** Мои публикации */
  Content = 'content',
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
  due: string;
  isDone: boolean;
  canWork: boolean;
}

/** Исходная запись плана проекта, без копирования задач */
export type MyPlanEntry = EntryBase &
  (
    | { kind: 'work'; item: PlanItem; project: Project }
    | { kind: 'music'; post: Post; songs: SongWithStages[]; project: Project }
    | { kind: 'video'; post: VideoPost; videoTitle: string; project: Project }
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

/** Чьи назначения показаны */
export enum MyPlanScope {
  /** Только мои назначения */
  Mine = 'mine',
  /** Все доступные записи */
  All = 'all',
}

/** Создание в выбранном доступном проекте */
export interface MyPlanComposerProps {
  projects: Project[];
  projectId: string;
  meId: string;
}
