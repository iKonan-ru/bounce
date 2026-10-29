import type { FormEvent } from 'react';
import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { useProjectPeople, PeopleKind } from '@/entities/project';
import { createTask } from '@/entities/task';
import { pb, queryKeys, getErrorText } from '@/shared/api';
import {
  getDateLabel,
  convertDayToPbDate,
  getMentionedIds,
} from '@/shared/utils';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { COLLAPSE_MS } from '../constants/task-composer';
import type { UseTaskComposerResult } from '../types/task-composer';
import { DueChoice } from '../types/task-composer';

/** Подпись кнопки даты: выбранный день или "Дата" */
function getDateChipLabel(customDate: Date | undefined): string {
  if (!customDate) {
    return 'Дата';
  }

  return getDateLabel(convertDayToPbDate(customDate));
}

/** Форма новой задачи: название, срок, "мне" и отправка */
export function useTaskComposer(
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
