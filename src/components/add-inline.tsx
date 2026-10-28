import { Plus } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// Поле с кнопкой "Добавить" в конце списка: этап, подэтап, этап шаблона.
export function AddInline({
  id,
  placeholder,
  onAdd,
  busy,
  maxLength = 120,
}: {
  id: string;
  placeholder: string;
  onAdd: (title: string) => Promise<unknown> | void;
  busy?: boolean;
  maxLength?: number;
}) {
  const [title, setTitle] = useState('');
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
  return (
    <form onSubmit={(e) => void submit(e)} className="flex gap-2">
      <label htmlFor={id} className="sr-only">
        {placeholder}
      </label>
      <Input
        id={id}
        placeholder={placeholder}
        maxLength={maxLength}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="h-11"
      />
      <Button type="submit" variant="secondary" className="h-11" disabled={!title.trim() || busy}>
        <Plus data-icon="inline-start" />
        Добавить
      </Button>
    </form>
  );
}
