import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, User as UserIcon } from 'lucide-react';
import { type FormEvent, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Collapse } from '@/components/collapse';
import { GROUP } from '@/components/page';
import { TitleComposer } from '@/components/title-composer';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { errorText } from '@/lib/errors';
import { dateLabel, fromDay } from '@/lib/format';
import { mentionedIds } from '@/lib/mentions';
import { pb } from '@/lib/pb';
import { useProjectPeople } from '@/lib/people';
import { queryKeys } from '@/lib/query-keys';
import { createTask } from '@/lib/tasks';
import { cn } from '@/lib/utils';

type DueChoice = 'none' | 'today' | 'tomorrow' | 'date';

// Фокус переходит из поля на кнопки сроков и обратно: строка сроков прячется, только если за это
// время он не вернулся в форму.
const COLLAPSE_MS = 200;

// Новая задача: название, по желанию - срок (сегодня, завтра, дата) и "мне". Enter - добавить
// и писать следующую.
export function TaskComposer({ projectId, meId }: { projectId: string; meId: string }) {
  const client = useQueryClient();
  const [title, setTitle] = useState('');
  const [focused, setFocused] = useState(false);
  const [due, setDue] = useState<DueChoice>('none');
  const [date, setDate] = useState<Date>();
  const [mine, setMine] = useState(false);
  const [pickDate, setPickDate] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const input = useRef<HTMLInputElement>(null);
  const workers = useProjectPeople(projectId, 'workers');

  const dueValue = (): string => {
    const d = new Date();
    if (due === 'today') return fromDay(d);
    if (due === 'tomorrow')
      return fromDay(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1));
    if (due === 'date' && date) return fromDay(date);
    return '';
  };

  const add = useMutation({
    mutationFn: () =>
      createTask(pb, {
        project: projectId,
        title,
        author: meId,
        due: dueValue(),
        // упомянутые в названии - исполнители, "мне" - ещё и я
        assignees: [...new Set([...(mine ? [meId] : []), ...mentionedIds(title, workers)])],
      }),
    onSuccess: async () => {
      setTitle('');
      input.current?.focus();
      await client.invalidateQueries({ queryKey: queryKeys.tasks.ofProject(projectId) });
    },
    onError: (e) => toast.error(errorText(e, 'Задача не добавлена: проверьте соединение')),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    if (title.trim() && !add.isPending) add.mutate();
  }

  const expanded = focused || title.trim() !== '' || pickDate;
  const chip = (on: boolean) =>
    cn(
      'flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm transition-colors',
      on ? 'bg-tape text-tape-ink' : 'bg-groove/70 text-dim hover:text-ink',
    );

  return (
    <form
      onSubmit={submit}
      onFocus={() => {
        clearTimeout(blurTimer.current);
        setFocused(true);
      }}
      onBlur={() => {
        blurTimer.current = setTimeout(() => setFocused(false), COLLAPSE_MS);
      }}
      className={cn(GROUP, 'transition-shadow', expanded && 'ring-2 ring-ring/30')}
    >
      <TitleComposer
        id="new-task"
        label="Новая задача"
        value={title}
        onChange={setTitle}
        projectId={projectId}
        busy={add.isPending}
        inputRef={input}
      />
      <Collapse open={expanded}>
        <div className="flex gap-1.5 overflow-x-auto px-4 pb-3 [scrollbar-width:none]">
          <button
            type="button"
            className={chip(due === 'today')}
            onClick={() => setDue(due === 'today' ? 'none' : 'today')}
          >
            Сегодня
          </button>
          <button
            type="button"
            className={chip(due === 'tomorrow')}
            onClick={() => setDue(due === 'tomorrow' ? 'none' : 'tomorrow')}
          >
            Завтра
          </button>
          <Popover open={pickDate} onOpenChange={setPickDate}>
            <PopoverTrigger asChild>
              <button type="button" className={chip(due === 'date')}>
                <CalendarDays className="size-3.5" />
                {due === 'date' && date ? dateLabel(fromDay(date)) : 'Дата'}
              </button>
            </PopoverTrigger>
            <PopoverContent>
              <Calendar
                mode="single"
                selected={due === 'date' ? date : undefined}
                onSelect={(d) => {
                  setDate(d);
                  setDue(d ? 'date' : 'none');
                  setPickDate(false);
                  input.current?.focus();
                }}
              />
            </PopoverContent>
          </Popover>
          <button type="button" className={chip(mine)} onClick={() => setMine(!mine)}>
            <UserIcon className="size-3.5" />
            Мне
          </button>
        </div>
      </Collapse>
    </form>
  );
}
