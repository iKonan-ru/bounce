import type { ChangeEvent } from 'react';
import type { PromoStep } from '@/entities/post';

/** Правка публикации промо-плана */
export interface PromoStepPatch extends Partial<
  Pick<PromoStep, 'title' | 'offset' | 'platforms' | 'comment'>
> {}

/** Правка публикации с её id */
export interface PromoStepUpdate {
  id: string;
  patch: PromoStepPatch;
}

/** Когда публикация относительно релиза */
export enum ReleaseTiming {
  /** До релиза */
  Before = 'before',
  /** В день релиза */
  Day = 'day',
  /** После релиза */
  After = 'after',
}

/** Пропсы промо-плана */
export interface PromoTemplateProps {
  projectId: string;
  /** Править могут редакторы и владелец */
  canEdit: boolean;
}

/** Результат хука промо-плана */
export interface UsePromoTemplateResult {
  /** Публикации по сдвигу от релиза */
  steps: PromoStep[];
  /** Пусто, и смотрит тот, кто не правит: показать "Публикаций нет" */
  showEmpty: boolean;
  /** Открытая публикация */
  openId: string | undefined;
  isAdding: boolean;
  onStepToggle: (id: string) => void;
  onStepSave: (id: string, patch: PromoStepPatch) => void;
  onStepRemove: (id: string) => void;
  onStepAdd: (title: string) => Promise<PromoStep>;
}

/** Пропсы публикации промо-плана */
export interface PromoRowProps {
  step: PromoStep;
  canEdit: boolean;
  isOpen: boolean;
  onToggle: (id: string) => void;
  onSave: (id: string, patch: PromoStepPatch) => void;
  onRemove: (id: string) => void;
}

/** Параметры хука публикации промо-плана */
export interface UsePromoRowParams extends Pick<
  PromoRowProps,
  'step' | 'onToggle' | 'onSave' | 'onRemove'
> {}

/** Результат хука публикации промо-плана */
export interface UsePromoRowResult {
  isConfirming: boolean;
  setIsConfirming: (isConfirming: boolean) => void;
  offsetLabel: string;
  platforms: string[];
  timing: ReleaseTiming;
  /** Число дней до или после релиза, строкой для поля */
  daysValue: string;
  titleInputId: string;
  daysInputId: string;
  commentId: string;
  comment: string;
  removeTitle: string;
  onToggleClick: () => void;
  onTitleSave: (title: string) => void;
  onTimingChange: (timing: ReleaseTiming) => void;
  onDaysSave: (days: string) => void;
  onPlatformToggle: (id: string, isSelected: boolean) => void;
  onCommentSave: (comment: string) => void;
  onRemoveClick: () => void;
  onRemoveConfirm: () => void;
}

/** Пропсы строки публикации без раскрытия */
export interface PromoRowSummaryProps {
  step: PromoStep;
}

/** Пропсы поля комментария */
export interface CommentFieldProps {
  id: string;
  value: string;
  onSave: (comment: string) => void;
}

/** Результат хука поля комментария */
export interface UseCommentFieldResult {
  draft: string;
  onDraftChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  onFieldFocus: () => void;
  onFieldBlur: () => void;
}
