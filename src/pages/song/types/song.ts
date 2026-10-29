import type { ReactNode } from 'react';
import type { SongStage, SongWithStages } from '@/entities/song';
import type { User } from '@/entities/user';
import type { Crumb, NoteScope, PendingImage } from '@/shared/types';

/** Пропсы строки этапа */
export interface SongStageRowProps {
  projectId: string;
  songId: string;
  stage: SongStage;
  /** Ручка перетаскивания из SortableList */
  handle: ReactNode;
  canEdit: boolean;
  /** Люди проекта по id: аватары исполнителей */
  people: Map<string, User>;
}

/** Данные строки этапа */
export interface SongStageRowState {
  isLate: boolean;
  isSkipped: boolean;
  hasDetails: boolean;
  /** Сведения одной строкой: подэтапы и срок */
  detailsText: string;
  /** Исполнители этапа среди людей проекта */
  assignees: User[];
}

/** Пропсы секции этапов */
export interface StagesSectionProps {
  projectId: string;
  songId: string;
  stages: SongStage[];
  /** Состав и порядок этапов - редакторы; остальные только открывают этап */
  canEdit: boolean;
}

/** Состояние и действия секции этапов */
export interface UseStagesSectionResult {
  people: Map<string, User>;
  doneCount: number;
  totalCount: number;
  /** Этапов нет, но их можно взять из шаблона проекта */
  canAddFromTemplate: boolean;
  isAddingFromTemplate: boolean;
  isAdding: boolean;
  onFromTemplateClick: () => void;
  onStageAdd: (title: string) => Promise<unknown>;
  onStagesReorder: (from: string, to: string) => void;
}

/** Пропсы кнопок под шапкой песни */
export interface SongLinksProps {
  projectId: string;
  songId: string;
  /** Проверенная ссылка Bandlink; null - нет ссылки */
  bandlink: string | null;
}

/** Состояние страницы песни */
export interface UseSongPageResult {
  projectId: string;
  songId: string;
  crumbs: Crumb[];
  canEdit: boolean;
  canWork: boolean;
  meId: string | undefined;
  isPending: boolean;
  song: SongWithStages | undefined;
  notesScope: NoteScope;
  /** Загрузить первую обложку: нажатие на пустую обложку в шапке */
  onCoverPick: (file: File) => void;
  coverPending: PendingImage | undefined;
}
