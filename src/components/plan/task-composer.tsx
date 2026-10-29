import { CalendarDays, User as UserIcon } from 'lucide-react';
import {
  type Dispatch,
  type FormEvent,
  type ReactNode,
  type RefObject,
  type SetStateAction,
  useRef,
  useState,
} from 'react';
import { toast } from 'sonner';
import { Collapse } from '@/components/collapse';
import { GROUP } from '@/components/page';
import { TitleComposer } from '@/components/title-composer';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { getErrorText } from '@/lib/errors';
import { convertDayToPbDate, getDateLabel } from '@/lib/format';
import { getMentionedIds } from '@/lib/mentions';
import { pb } from '@/lib/pb';
import { PeopleKind, useProjectPeople } from '@/lib/people';
import { queryKeys } from '@/lib/query-keys';
import { createTask } from '@/lib/tasks';
import { cn } from '@/lib/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';

/** Срок новой задачи */
enum DueChoice {
  /** Без срока */
  None = 'none',
  /** Сегодня */
  Today = 'today',
  /** Завтра */
  Tomorrow = 'tomorrow',
  /** День, выбранный в календаре */
  CustomDate = 'date',
}

/**
 * Через столько миллисекунд после ухода фокуса строка сроков прячется
 *
 * Фокус переходит из поля на кнопки сроков и обратно: строка прячется, только если за это время
 * он не вернулся в форму
 */
const COLLAPSE_MS = 200;

/** Пропсы новой задачи */
interface TaskComposerProps {
  projectId: string;
  /** Текущий пользователь: автор задачи и исполнитель по кнопке "Мне" */
  meId: string;
}

/** Состояние и действия формы новой задачи */
interface UseTaskComposerResult {
  title: string;
  setTitle: Dispatch<SetStateAction<string>>;
  isAdding: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  /** Строка сроков видна: фокус в форме, название набрано или открыт календарь */
  isExpanded: boolean;
  isTodayChosen: boolean;
  isTomorrowChosen: boolean;
  isCustomDateChosen: boolean;
  /** День из календаря, если выбран срок "дата" */
  customDate: Date | undefined;
  /** Подпись кнопки даты: выбранный день или "Дата" */
  dateChipLabel: string;
  isMine: boolean;
  isDatePickerOpen: boolean;
  setIsDatePickerOpen: Dispatch<SetStateAction<boolean>>;
  onSubmit: (event: FormEvent) => void;
  onFormFocus: () => void;
  onFormBlur: () => void;
  onTodayClick: () => void;
  onTomorrowClick: () => void;
  onDateSelect: (date: Date | undefined) => void;
  onMineClick: () => void;
}

/** Подпись кнопки даты: выбранный день или "Дата" */
function getDateChipLabel(customDate: Date | undefined): string {
  if (!customDate) {
    return 'Дата';
  }

  return getDateLabel(convertDayToPbDate(customDate));
}

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

/** Форма новой задачи: название, срок, "мне" и отправка */
function useTaskComposer(
  projectId: string,
  meId: string
): UseTaskComposerResult {
  const client = useQueryClient();
  const [title, setTitle] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [dueChoice, setDueChoice] = useState<DueChoice>(DueChoice.None);
  const [pickedDate, setPickedDate] = useState<Date>();
  const [isMine, setIsMine] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);
  const workers = useProjectPeople(projectId, PeopleKind.Workers);

  const isTodayChosen = dueChoice === DueChoice.Today;
  const isTomorrowChosen = dueChoice === DueChoice.Tomorrow;
  const isCustomDateChosen = dueChoice === DueChoice.CustomDate;
  const customDate = isCustomDateChosen ? pickedDate : undefined;
  const hasTitle = title.trim() !== '';
  const isExpanded = isFocused || hasTitle || isDatePickerOpen;

  const getDueValue = (): string => {
    const today = new Date();

    if (isTodayChosen) {
      return convertDayToPbDate(today);
    }

    if (isTomorrowChosen) {
      const tomorrow = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() + 1
      );

      return convertDayToPbDate(tomorrow);
    }

    if (customDate) {
      return convertDayToPbDate(customDate);
    }

    return '';
  };

  // упомянутые в названии - исполнители, "мне" - ещё и я
  const getAssignees = (): string[] => {
    const mentionedIds = getMentionedIds(title, workers);

    if (!isMine) {
      return [...new Set(mentionedIds)];
    }

    return [...new Set([meId, ...mentionedIds])];
  };

  const focusInput = (): void => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const addTask = useMutation({
    mutationFn: () =>
      createTask(pb, {
        project: projectId,
        title,
        author: meId,
        due: getDueValue(),
        assignees: getAssignees(),
      }),
    onSuccess: async () => {
      setTitle('');
      focusInput();
      await client.invalidateQueries({
        queryKey: queryKeys.tasks.ofProject(projectId),
      });
    },
    onError: (error) => {
      toast.error(
        getErrorText(error, 'Задача не добавлена: проверьте соединение')
      );
    },
  });

  const onSubmit = (event: FormEvent): void => {
    event.preventDefault();
    const canAdd = hasTitle && !addTask.isPending;

    if (canAdd) {
      addTask.mutate();
    }
  };

  const onFormFocus = (): void => {
    clearTimeout(blurTimer.current);
    setIsFocused(true);
  };

  const onFormBlur = (): void => {
    blurTimer.current = setTimeout(() => {
      setIsFocused(false);
    }, COLLAPSE_MS);
  };

  const handleDueToggle = (choice: DueChoice): void => {
    if (dueChoice === choice) {
      setDueChoice(DueChoice.None);

      return;
    }

    setDueChoice(choice);
  };

  const onTodayClick = (): void => {
    handleDueToggle(DueChoice.Today);
  };

  const onTomorrowClick = (): void => {
    handleDueToggle(DueChoice.Tomorrow);
  };

  const onDateSelect = (date: Date | undefined): void => {
    setPickedDate(date);
    const nextDueChoice = date ? DueChoice.CustomDate : DueChoice.None;
    setDueChoice(nextDueChoice);
    setIsDatePickerOpen(false);
    focusInput();
  };

  const onMineClick = (): void => {
    setIsMine(!isMine);
  };

  return {
    title,
    setTitle,
    isAdding: addTask.isPending,
    inputRef,
    isExpanded,
    isTodayChosen,
    isTomorrowChosen,
    isCustomDateChosen,
    customDate,
    dateChipLabel: getDateChipLabel(customDate),
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
  };
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
