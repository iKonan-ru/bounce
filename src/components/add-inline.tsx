import { Plus } from 'lucide-react';
import { type FormEvent, useRef, useState } from 'react';
import { useMentions } from '@/components/mentions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useProjectPeople } from '@/lib/people';
import { cn } from '@/lib/utils';

// Строка "+ Добавить ..." в конце списка: по нажатию превращается в поле (как в Things и
// Linear). Enter - добавить и продолжить, Escape или пустое поле при уходе - свернуть.
export function AddRow({
  id,
  label,
  onAdd,
  busy,
  maxLength = 120,
  mentionProject,
  className,
}: {
  id: string;
  label: string;
  onAdd: (title: string) => Promise<unknown> | void;
  busy?: boolean;
  maxLength?: number;
  // упоминания людей этого проекта через @
  mentionProject?: string | undefined;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const people = useProjectPeople(mentionProject, 'active');
  const mentions = useMentions({ ref: input, value: title, setValue: setTitle, people });

  async function submit(e: FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t || busy) return;
    try {
      await onAdd(t);
      setTitle('');
    } catch {
      // сообщение об ошибке показывает вызывающий; текст остаётся в поле
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'flex min-h-12 w-full items-center gap-3 px-4 text-left text-dim transition-colors hover:bg-groove/40 hover:text-ink md:min-h-10',
          className,
        )}
      >
        <Plus className="size-4" />
        {label}
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => void submit(e)}
      className={cn('flex items-center gap-2 px-2 py-1.5', className)}
    >
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Input
        ref={input}
        id={id}
        autoFocus
        placeholder={label}
        maxLength={maxLength}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onSelect={mentions.sync}
        onKeyDown={(e) => {
          if (mentions.onKeyDown(e)) return;
          if (e.key === 'Escape') {
            setTitle('');
            setOpen(false);
          }
        }}
        onBlur={() => !title.trim() && setOpen(false)}
        className="h-9 border-0 bg-transparent px-2 shadow-none focus-visible:ring-0 dark:bg-transparent"
      />
      {mentions.menu}
      <Button type="submit" size="sm" className="h-8" disabled={!title.trim() || busy}>
        Добавить
      </Button>
    </form>
  );
}
