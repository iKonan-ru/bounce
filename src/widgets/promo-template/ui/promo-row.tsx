import { ChevronRight, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { getOffsetLabel } from '@/entities/post';
import type { Service } from '@/entities/service';
import {
  getServiceById,
  POST_PLATFORMS,
  ServiceIcon,
  PlatformToggles,
} from '@/entities/service';
import {
  Collapse,
  AutosaveInput,
  Segmented,
  Button,
  ConfirmDialog,
  Textarea,
} from '@/shared/ui';
import { cn } from '@/shared/utils';
import {
  NON_DIGIT_RE,
  MIN_DAYS,
  MAX_DAYS,
  LINE_BREAK,
  COMMENT_SEPARATOR,
  TITLE_MAX_LENGTH,
  TIMING_OPTIONS,
  DAYS_MAX_LENGTH,
  COMMENT_MAX_LENGTH,
} from '../constants/promo-template';
import { useCommentField } from '../hooks/use-comment-field';
import { usePromoRow } from '../hooks/use-promo-row';
import type {
  PromoRowSummaryProps,
  PromoRowProps,
  CommentFieldProps,
} from '../types/promo-template';
import { ReleaseTiming } from '../types/promo-template';

/** Только цифры из набранного */
function filterDigits(value: string): string {
  return value.replace(NON_DIGIT_RE, '');
}

/** Число дней в допустимых пределах */
function checkIsValidDays(value: string): boolean {
  const days = Number(value);
  const isAboveMin = days >= MIN_DAYS;
  const isBelowMax = days <= MAX_DAYS;

  return isAboveMin && isBelowMax;
}

/** Начало комментария после срока: первая строка; без комментария - ничего */
function getCommentPreview(comment: string | undefined): string {
  if (!comment) {
    return '';
  }

  const firstLine = comment.split(LINE_BREAK)[0] ?? '';

  return `${COMMENT_SEPARATOR}${firstLine}`;
}

/** Сервисы площадок по их id; неизвестные пропускаются */
function getPlatformServices(ids: readonly string[]): Service[] {
  return ids.flatMap((id) => {
    const service = getServiceById(POST_PLATFORMS, id);

    if (!service) {
      return [];
    }

    return [service];
  });
}

/** Строка публикации: название, срок, начало комментария и значки площадок */
function PromoRowSummary({ step }: PromoRowSummaryProps): ReactNode {
  const offsetLabel = getOffsetLabel(step.offset ?? 0);
  const commentPreview = getCommentPreview(step.comment);
  const platformServices = getPlatformServices(step.platforms ?? []);

  return (
    <>
      <span className="min-w-0 flex-1">
        <span className="block truncate">{step.title}</span>
        <span className="block truncate text-sm text-dim">
          {offsetLabel}
          {commentPreview}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-1 text-dim">
        {platformServices.map((service) => (
          <ServiceIcon
            key={service.id}
            service={service}
            className="size-3.5"
          />
        ))}
      </span>
    </>
  );
}

/** Публикация промо-плана: строка, а у тех, кто правит, - раскрывающиеся поля */
export function PromoRow({
  step,
  canEdit,
  isOpen,
  onToggle,
  onSave,
  onRemove,
}: PromoRowProps): ReactNode {
  const {
    isConfirming,
    setIsConfirming,
    offsetLabel,
    platforms,
    timing,
    daysValue,
    titleInputId,
    daysInputId,
    commentId,
    comment,
    removeTitle,
    onToggleClick,
    onTitleSave,
    onTimingChange,
    onDaysSave,
    onPlatformToggle,
    onCommentSave,
    onRemoveClick,
    onRemoveConfirm,
  } = usePromoRow({ step, onToggle, onSave, onRemove });

  if (!canEdit) {
    return (
      <div className="flex min-h-14 items-center gap-3 px-4 py-2">
        <PromoRowSummary step={step} />
      </div>
    );
  }

  const hasDays = timing !== ReleaseTiming.Day;
  const chevronClassName = cn(
    'size-4 shrink-0 text-dim/60 transition-transform',
    {
      'rotate-90': isOpen,
    }
  );

  return (
    <div>
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={onToggleClick}
        className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-groove/30"
      >
        <PromoRowSummary step={step} />
        <ChevronRight className={chevronClassName} />
      </button>
      <Collapse isOpen={isOpen}>
        <div className="flex flex-col gap-3 bg-console/50 px-4 pt-2 pb-4 dark:bg-console/40">
          <div className="flex items-center gap-2">
            <span className="w-24 shrink-0 text-sm text-dim">Название</span>
            <AutosaveInput
              id={titleInputId}
              required
              maxLength={TITLE_MAX_LENGTH}
              value={step.title}
              className="text-left"
              onSave={onTitleSave}
            />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm text-dim">Когда</span>
            <Segmented
              label="Когда"
              value={timing}
              onChange={onTimingChange}
              options={TIMING_OPTIONS}
              className="bg-panel ring-1 ring-border/70 dark:ring-border/40"
            />
            {hasDays && (
              <div className="flex items-center gap-2">
                <AutosaveInput
                  id={daysInputId}
                  inputMode="numeric"
                  maxLength={DAYS_MAX_LENGTH}
                  value={daysValue}
                  filter={filterDigits}
                  validate={checkIsValidDays}
                  onSave={onDaysSave}
                  className="w-16 bg-panel text-center ring-1 ring-border/70 dark:ring-border/40"
                />
                <span className="text-sm text-dim">{offsetLabel}</span>
              </div>
            )}
          </div>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm text-dim">Площадки</legend>
            <div className="flex flex-wrap gap-1.5">
              <PlatformToggles value={platforms} onToggle={onPlatformToggle} />
            </div>
          </fieldset>
          <div className="flex flex-col gap-2">
            <label htmlFor={commentId} className="text-sm text-dim">
              Комментарий
            </label>
            <CommentField
              id={commentId}
              value={comment}
              onSave={onCommentSave}
            />
          </div>
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="-ml-2 h-9 px-2 text-led-red hover:bg-led-red/10 hover:text-led-red"
              onClick={onRemoveClick}
            >
              <Trash2 data-icon="inline-start" />
              Убрать из промо-плана
            </Button>
          </div>
        </div>
      </Collapse>
      <ConfirmDialog
        open={isConfirming}
        onOpenChange={setIsConfirming}
        title={removeTitle}
        description="Публикации, которые уже созданы у песен, не изменятся."
        confirmLabel="Убрать"
        onConfirm={onRemoveConfirm}
      />
    </div>
  );
}

/** Заметки о публикации: сохраняются, когда уходят из поля */
function CommentField({ id, value, onSave }: CommentFieldProps): ReactNode {
  const { draft, onDraftChange, onFieldFocus, onFieldBlur } = useCommentField(
    value,
    onSave
  );

  return (
    <Textarea
      id={id}
      maxLength={COMMENT_MAX_LENGTH}
      placeholder="Что показать, что написать, ссылки..."
      value={draft}
      onChange={onDraftChange}
      onFocus={onFieldFocus}
      onBlur={onFieldBlur}
      className="min-h-16 bg-panel"
    />
  );
}
