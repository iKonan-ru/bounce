import type { ReactNode } from 'react';
import type { User } from '@/entities/user';
import type { Video, VideoPatch, VideoStage } from '@/entities/video';

/** Окно свойств карточки */
export interface VideoEditorProps {
  video: Video;
  isSaving: boolean;
  onSave: (patch: VideoPatch) => Promise<void>;
  onClose: () => void;
}

/** Строка этапа */
export interface VideoStageRowProps {
  stage: VideoStage;
  projectId: string;
  videoId: string;
  handle: ReactNode;
  canEdit: boolean;
  people: Map<string, User>;
}

/** Кнопка применения одного шаблона */
export interface TemplateChoiceProps {
  value: string;
  label: string;
  onChoose: (value: string) => void;
}

/** Строка внешнего материала в форме */
export interface MaterialRowProps {
  index: number;
  name: string;
  url: string;
  onChange: (index: number, field: 'name' | 'url', value: string) => void;
  onRemove: (index: number) => void;
}
