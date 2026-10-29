import { useState } from 'react';
import { getOffsetLabel } from '@/entities/post';
import { POST_PLATFORMS } from '@/entities/service';
import { BEFORE_SIGN, AFTER_SIGN, MIN_DAYS } from '../constants/promo-template';
import type {
  UsePromoRowParams,
  UsePromoRowResult,
} from '../types/promo-template';
import { ReleaseTiming } from '../types/promo-template';

/** Когда публикация относительно релиза, по сдвигу в днях */
function getReleaseTiming(offset: number): ReleaseTiming {
  if (offset < 0) {
    return ReleaseTiming.Before;
  }

  if (offset > 0) {
    return ReleaseTiming.After;
  }

  return ReleaseTiming.Day;
}

/** Знак сдвига: до релиза - минус, после - плюс */
function getTimingSign(timing: ReleaseTiming): number {
  if (timing === ReleaseTiming.Before) {
    return BEFORE_SIGN;
  }

  return AFTER_SIGN;
}

/** Сдвиг при смене "когда": в день релиза - 0, иначе прежнее число дней (не меньше одного) */
function getTimingOffset(timing: ReleaseTiming, days: number): number {
  if (timing === ReleaseTiming.Day) {
    return 0;
  }

  return getTimingSign(timing) * Math.max(MIN_DAYS, days);
}

/** Площадки после нажатия: выбранная убирается, новая встаёт в порядке площадок */
function getToggledPlatforms(
  platforms: readonly string[],
  id: string,
  isSelected: boolean
): string[] {
  if (isSelected) {
    return platforms.filter((platformId) => platformId !== id);
  }

  return POST_PLATFORMS.map((platform) => platform.id).filter((platformId) => {
    const isToggled = platformId === id;
    const isKept = platforms.includes(platformId);

    return isToggled || isKept;
  });
}

/** Публикация промо-плана: состояние раскрытой строки и правки её полей */
export function usePromoRow({
  step,
  onToggle,
  onSave,
  onRemove,
}: UsePromoRowParams): UsePromoRowResult {
  const [isConfirming, setIsConfirming] = useState(false);
  const offset = step.offset ?? 0;
  const platforms = step.platforms ?? [];
  const timing = getReleaseTiming(offset);
  const days = Math.abs(offset);

  const onToggleClick = (): void => {
    onToggle(step.id);
  };
  const onTitleSave = (title: string): void => {
    onSave(step.id, { title });
  };
  const onTimingChange = (nextTiming: ReleaseTiming): void => {
    onSave(step.id, { offset: getTimingOffset(nextTiming, days) });
  };
  const onDaysSave = (nextDays: string): void => {
    onSave(step.id, { offset: getTimingSign(timing) * Number(nextDays) });
  };
  const onPlatformToggle = (id: string, isSelected: boolean): void => {
    onSave(step.id, {
      platforms: getToggledPlatforms(platforms, id, isSelected),
    });
  };
  const onCommentSave = (comment: string): void => {
    onSave(step.id, { comment });
  };
  const onRemoveClick = (): void => {
    setIsConfirming(true);
  };
  const onRemoveConfirm = (): void => {
    setIsConfirming(false);
    onRemove(step.id);
  };

  return {
    isConfirming,
    setIsConfirming,
    offsetLabel: getOffsetLabel(offset),
    platforms,
    timing,
    daysValue: String(days),
    titleInputId: `promo-title-${step.id}`,
    daysInputId: `promo-days-${step.id}`,
    commentId: `promo-comment-${step.id}`,
    comment: step.comment ?? '',
    removeTitle: `Убрать "${step.title}" из промо-плана?`,
    onToggleClick,
    onTitleSave,
    onTimingChange,
    onDaysSave,
    onPlatformToggle,
    onCommentSave,
    onRemoveClick,
    onRemoveConfirm,
  };
}
