import { Plus } from 'lucide-react';
import { type RefObject, useRef } from 'react';
import { useMentions } from '@/components/mentions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useProjectPeople } from '@/lib/people';

// Строка добавления в плане и контент-плане: поле названия с упоминаниями людей проекта и
// кнопка "Добавить", пока есть что добавлять. Форму (отправку по Enter) даёт вызывающий.
export function TitleComposer({
  id,
  label,
  value,
  onChange,
  projectId,
  busy,
  inputRef,
}: {
  id: string;
  // подпись и подсказка в пустом поле
  label: string;
  value: string;
  onChange: (value: string) => void;
  projectId: string;
  busy: boolean;
  // поле - тому, кто возвращает в него фокус
  inputRef?: RefObject<HTMLInputElement | null>;
}) {
  const own = useRef<HTMLInputElement>(null);
  const input = inputRef ?? own;
  const people = useProjectPeople(projectId, 'active');
  const mentions = useMentions({ ref: input, value, setValue: onChange, people });
  return (
    <div className="flex items-center gap-2 px-4">
      <Plus className="size-4 shrink-0 text-dim" />
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Input
        ref={input}
        id={id}
        placeholder={label}
        maxLength={300}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onSelect={mentions.sync}
        onKeyDown={(e) => {
          mentions.onKeyDown(e);
        }}
        className="h-12 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 md:h-11 dark:bg-transparent"
      />
      {mentions.menu}
      {value.trim() && (
        <Button type="submit" size="sm" className="h-8 animate-enter" disabled={busy}>
          Добавить
        </Button>
      )}
    </div>
  );
}
