import { CalendarDays, User as UserIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { TitleComposer } from '@/features/mentions';
import { GROUP } from '@/shared/constants';
import {
  Collapse,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Calendar,
} from '@/shared/ui';
import { cn } from '@/shared/utils';
import { useTaskComposer } from '../hooks/use-task-composer';
import type { TaskComposerProps } from '../types/task-composer';

/** Класс кнопки срока или "Мне": выбранная - залита */
function getChipClassName(isChosen: boolean): string {
  return cn(
    'flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm transition-colors',
    {
      'bg-tape text-tape-ink': isChosen,
      'bg-groove/70 text-dim hover:text-ink': !isChosen,
    }
  );
}

/**
 * Новая задача: название, по желанию - срок (сегодня, завтра, дата) и "мне"
 *
 * Enter - добавить и писать следующую
 */
export function TaskComposer({
  projectId,
  meId,
}: TaskComposerProps): ReactNode {
  const {
    title,
    setTitle,
    isAdding,
    inputRef,
    isExpanded,
    isTodayChosen,
    isTomorrowChosen,
    isCustomDateChosen,
    customDate,
    dateChipLabel,
    isMine,
    isDatePickerOpen,
    setIsDatePickerOpen,
    onSubmit,
    onFormFocus,
    onFormBlur,
    onTodayClick,
    onTomorrowClick,
    onDateSelect,
    onMineClick,
  } = useTaskComposer(projectId, meId);
  const formClassName = cn(GROUP, 'transition-shadow', {
    'ring-2 ring-ring/30': isExpanded,
  });
  const todayChipClassName = getChipClassName(isTodayChosen);
  const tomorrowChipClassName = getChipClassName(isTomorrowChosen);
  const dateChipClassName = getChipClassName(isCustomDateChosen);
  const mineChipClassName = getChipClassName(isMine);

  return (
    <form
      onSubmit={onSubmit}
      onFocus={onFormFocus}
      onBlur={onFormBlur}
      className={formClassName}
    >
      <TitleComposer
        id="new-task"
        label="Новая задача"
        value={title}
        onChange={setTitle}
        projectId={projectId}
        isBusy={isAdding}
        inputRef={inputRef}
      />
      <Collapse isOpen={isExpanded}>
        <div className="flex gap-1.5 overflow-x-auto px-4 pb-3 [scrollbar-width:none]">
          <button
            type="button"
            className={todayChipClassName}
            onClick={onTodayClick}
          >
            Сегодня
          </button>
          <button
            type="button"
            className={tomorrowChipClassName}
            onClick={onTomorrowClick}
          >
            Завтра
          </button>
          <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
            <PopoverTrigger asChild>
              <button type="button" className={dateChipClassName}>
                <CalendarDays className="size-3.5" />
                {dateChipLabel}
              </button>
            </PopoverTrigger>
            <PopoverContent>
              <Calendar
                mode="single"
                selected={customDate}
                onSelect={onDateSelect}
              />
            </PopoverContent>
          </Popover>
          <button
            type="button"
            className={mineChipClassName}
            onClick={onMineClick}
          >
            <UserIcon className="size-3.5" />
            Мне
          </button>
        </div>
      </Collapse>
    </form>
  );
}
