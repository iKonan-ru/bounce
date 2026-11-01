import type { ReactNode } from 'react';
import type { OtherStage } from '@/entities/other';
import type { SongStage, StagePatch } from '@/entities/song';
import type { VideoStage } from '@/entities/video';
import type { Crumb } from '@/shared/types';

/** Пропсы страницы этапа: свойства, подэтапы и заметки */
export interface StageViewProps {
  projectId: string;
  crumbs: Crumb[];
  canEdit: boolean;
  canWork: boolean;
  isPending: boolean;
  /** Этап; undefined - нет такого этапа */
  stage: SongStage | VideoStage | OtherStage | undefined;
  /** Подпись места этапа: "Этап 2 из 5" */
  positionLabel: string;
  /** Лента заметок этапа: виджет заметок соседний, поэтому приходит готовой */
  notes: ReactNode;
  isConfirming: boolean;
  setIsConfirming: (isConfirming: boolean) => void;
  isRemoving: boolean;
  handleSave: (patch: StagePatch) => void;
  onTitleSave: (title: string) => void;
  onDeleteClick: () => void;
  onDeleteConfirm: () => void;
}
