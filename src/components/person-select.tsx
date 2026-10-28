import { useQuery } from '@tanstack/react-query';
import { Avatar } from '@/components/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { projectPeople } from '@/lib/model';
import { projectQuery } from '@/lib/queries';
import { cn } from '@/lib/utils';

const NOBODY = 'nobody';

// Кто делает: человек из проекта (кроме наблюдателей) или никто.
export function PersonSelect({
  projectId,
  value,
  onChange,
  disabled,
  id,
}: {
  projectId: string;
  value: string;
  onChange: (userId: string) => void;
  disabled?: boolean;
  id?: string;
}) {
  const project = useQuery(projectQuery(projectId));
  const people = project.data
    ? projectPeople(project.data)
        .filter((p) => p.role !== 'viewer' || p.user.id === value)
        .map((p) => p.user)
    : [];
  const current = people.find((u) => u.id === value);
  return (
    <Select
      value={value || NOBODY}
      disabled={disabled ?? false}
      onValueChange={(v) => onChange(v === NOBODY ? '' : v)}
    >
      <SelectTrigger
        id={id}
        aria-label="Кто делает"
        className={cn(
          '-mr-2 h-9 border-0 bg-transparent shadow-none dark:bg-transparent',
          !current && 'text-dim',
        )}
      >
        <SelectValue>
          {current ? (
            <span className="flex items-center gap-2">
              <Avatar user={current} className="size-5 text-[0.625rem]" />
              {current.name}
            </span>
          ) : (
            'Никто'
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent position="popper" align="end">
        {people.map((u) => (
          <SelectItem key={u.id} value={u.id} textValue={u.name}>
            <span className="flex items-center gap-2">
              <Avatar user={u} className="size-5 text-[0.625rem]" />
              {u.name}
            </span>
          </SelectItem>
        ))}
        <SelectItem value={NOBODY} textValue="Никто">
          Никто
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
