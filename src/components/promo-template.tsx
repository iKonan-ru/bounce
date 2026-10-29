import { ChevronRight, Trash2 } from 'lucide-react';
import { type ChangeEvent, type ReactNode, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AddRow } from '@/components/add-inline';
import { AutosaveInput } from '@/components/autosave-input';
import { Collapse } from '@/components/collapse';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { GROUP_ROWS, Section } from '@/components/page';
import { PlatformToggles } from '@/components/platform-toggles';
import { Segmented, type SegmentedOption } from '@/components/segmented';
import { ServiceIcon } from '@/components/service-icon';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { SAVE_FAILED } from '@/lib/errors';
import type { PromoStep } from '@/lib/model';
import { Collections, getCollection, pb } from '@/lib/pb';
import { getOffsetLabel } from '@/lib/posts';
import { promoQuery } from '@/lib/queries';
import { queryKeys } from '@/lib/query-keys';
import { getServiceById, POST_PLATFORMS, type Service } from '@/lib/services';
import { cn } from '@/lib/utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

/** Правка публикации промо-плана */
interface PromoStepPatch extends Partial<
  Pick<PromoStep, 'title' | 'offset' | 'platforms' | 'comment'>
> {}

/** Правка публикации с её id */
interface PromoStepUpdate {
  id: string;
  patch: PromoStepPatch;
}

/** Когда публикация относительно релиза */
enum ReleaseTiming {
  /** До релиза */
  Before = 'before',
  /** В день релиза */
  Day = 'day',
  /** После релиза */
  After = 'after',
}

/** Наименьшее число дней до или после релиза */
const MIN_DAYS = 1;

/** Наибольшее число дней до или после релиза */
const MAX_DAYS = 365;

/** Наибольшая длина названия публикации */
const TITLE_MAX_LENGTH = 300;

/** Наибольшая длина числа дней в поле */
const DAYS_MAX_LENGTH = 3;

/** Наибольшая длина комментария */
const COMMENT_MAX_LENGTH = 2000;

/** Всё, кроме цифр: в поле дней не набирается */
const NON_DIGIT_RE = /\D/g;

/** Перенос строки */
const LINE_BREAK = '\n';

/** Разделитель срока и начала комментария в строке публикации */
const COMMENT_SEPARATOR = ' \u00B7 ';

/** Сдвиг публикации до релиза: дни идут со знаком минус */
const BEFORE_SIGN = -1;

/** Сдвиг публикации после релиза: дни идут со знаком плюс */
const AFTER_SIGN = 1;

/** Варианты "когда" */
const TIMING_OPTIONS: readonly SegmentedOption<ReleaseTiming>[] = [
  { value: ReleaseTiming.Before, label: 'До релиза' },
  { value: ReleaseTiming.Day, label: 'В день' },
  { value: ReleaseTiming.After, label: 'После' },
];

/** Пропсы промо-плана */
interface PromoTemplateProps {
  projectId: string;
  /** Править могут редакторы и владелец */
  canEdit: boolean;
}

/** Результат хука промо-плана */
interface UsePromoTemplateResult {
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
interface PromoRowProps {
  step: PromoStep;
  canEdit: boolean;
  isOpen: boolean;
  onToggle: (id: string) => void;
  onSave: (id: string, patch: PromoStepPatch) => void;
  onRemove: (id: string) => void;
}

/** Параметры хука публикации промо-плана */
interface UsePromoRowParams extends Pick<
  PromoRowProps,
  'step' | 'onToggle' | 'onSave' | 'onRemove'
> {}

/** Результат хука публикации промо-плана */
interface UsePromoRowResult {
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
interface PromoRowSummaryProps {
  step: PromoStep;
}

/** Пропсы поля комментария */
interface CommentFieldProps {
  id: string;
  value: string;
  onSave: (comment: string) => void;
}

/** Результат хука поля комментария */
interface UseCommentFieldResult {
  draft: string;
  onDraftChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  onFieldFocus: () => void;
  onFieldBlur: () => void;
}

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

/** Публикации по сдвигу от релиза: сначала самые ранние */
function compareStepsByOffset(first: PromoStep, second: PromoStep): number {
  return (first.offset ?? 0) - (second.offset ?? 0);
}

/** Публикации с правкой; правка видна сразу, не дожидаясь сервера */
function applyStepUpdate(
  steps: PromoStep[] | undefined,
  { id, patch }: PromoStepUpdate
): PromoStep[] | undefined {
  if (!steps) {
    return steps;
  }

  return steps.map((step) => {
    if (step.id !== id) {
      return step;
    }

    return { ...step, ...patch };
  });
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

/** Публикации промо-плана: загрузка, добавление, правка и удаление */
function usePromoTemplate(
  projectId: string,
  canEdit: boolean
): UsePromoTemplateResult {
  const client = useQueryClient();
  const queryKey = promoQuery(projectId).queryKey;
  const stepsQuery = useQuery(promoQuery(projectId));
  const [openId, setOpenId] = useState<string>();
  const refreshSteps = (): Promise<void> =>
    client.invalidateQueries({
      queryKey: queryKeys.promo.ofProject(projectId),
    });

  const add = useMutation({
    mutationFn: (title: string) =>
      getCollection(pb, Collections.PromoTemplates).create<PromoStep>({
        project: projectId,
        title,
        offset: 0,
        platforms: [],
      }),
    onSuccess: async (step) => {
      await refreshSteps();
      setOpenId(step.id);
    },
    onError: () => toast.error(SAVE_FAILED),
  });
  const save = useMutation({
    mutationFn: ({ id, patch }: PromoStepUpdate) =>
      getCollection(pb, Collections.PromoTemplates).update(id, patch),
    // выбор виден сразу, не дожидаясь сервера
    onMutate: (update) => {
      client.setQueryData<PromoStep[]>(queryKey, (old) =>
        applyStepUpdate(old, update)
      );
    },
    onSettled: refreshSteps,
    onError: () => toast.error(SAVE_FAILED),
  });
  const remove = useMutation({
    mutationFn: (id: string) =>
      getCollection(pb, Collections.PromoTemplates).delete(id),
    onSuccess: refreshSteps,
    onError: () => toast.error('Не удалилось: проверьте соединение'),
  });

  const loadedSteps = stepsQuery.data ?? [];
  const sortedSteps = [...loadedSteps].sort(compareStepsByOffset);
  const isEmpty = sortedSteps.length === 0;
  const showEmpty = [stepsQuery.isSuccess, isEmpty, !canEdit].every(Boolean);

  const onStepToggle = (id: string): void => {
    const nextOpenId = openId === id ? undefined : id;
    setOpenId(nextOpenId);
  };
  const onStepSave = (id: string, patch: PromoStepPatch): void => {
    save.mutate({ id, patch });
  };
  const onStepRemove = (id: string): void => {
    remove.mutate(id);
  };
  const onStepAdd = (title: string): Promise<PromoStep> =>
    add.mutateAsync(title);

  return {
    steps: sortedSteps,
    showEmpty,
    openId,
    isAdding: add.isPending,
    onStepToggle,
    onStepSave,
    onStepRemove,
    onStepAdd,
  };
}

/**
 * Промо-план проекта: какие публикации кнопка "Добавить промо-план" создаст у песни и когда
 * относительно релиза; комментарий становится текстом публикации
 *
 * Правят редакторы и владелец, как этапы новых песен
 */
export function PromoTemplate({
  projectId,
  canEdit,
}: PromoTemplateProps): ReactNode {
  const {
    steps,
    showEmpty,
    openId,
    isAdding,
    onStepToggle,
    onStepSave,
    onStepRemove,
    onStepAdd,
  } = usePromoTemplate(projectId, canEdit);

  return (
    <Section title="Промо-план">
      <div className={GROUP_ROWS}>
        {steps.map((step) => {
          const isOpen = openId === step.id;

          return (
            <PromoRow
              key={step.id}
              step={step}
              canEdit={canEdit}
              isOpen={isOpen}
              onToggle={onStepToggle}
              onSave={onStepSave}
              onRemove={onStepRemove}
            />
          );
        })}
        {showEmpty && (
          <p className="px-4 py-3 text-sm text-dim">Публикаций нет</p>
        )}
        {canEdit && (
          <AddRow
            id="new-promo-step"
            label="Добавить публикацию"
            maxLength={TITLE_MAX_LENGTH}
            isBusy={isAdding}
            onAdd={onStepAdd}
          />
        )}
      </div>
    </Section>
  );
}

/** Публикация промо-плана: состояние раскрытой строки и правки её полей */
function usePromoRow({
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
function PromoRow({
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

/**
 * Черновик комментария: сохраняется, когда уходят из поля
 *
 * Пока поле не в фокусе, оно следует за сохранённым текстом (правки соавтора приходят сами)
 */
function useCommentField(
  value: string,
  onSave: (comment: string) => void
): UseCommentFieldResult {
  const [draft, setDraft] = useState(value);
  const [isFocused, setIsFocused] = useState(false);
  useEffect(() => {
    if (!isFocused) {
      setDraft(value);
    }
  }, [value, isFocused]);

  const onDraftChange = (event: ChangeEvent<HTMLTextAreaElement>): void => {
    setDraft(event.target.value);
  };
  const onFieldFocus = (): void => {
    setIsFocused(true);
  };
  const onFieldBlur = (): void => {
    setIsFocused(false);
    const next = draft.trim();

    if (next !== value) {
      onSave(next);
    }
  };

  return { draft, onDraftChange, onFieldFocus, onFieldBlur };
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
