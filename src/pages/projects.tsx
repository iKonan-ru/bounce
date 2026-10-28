import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { Avatar } from '@/components/avatar';
import { MembersPicker } from '@/components/members-picker';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useMe } from '@/lib/auth';
import { pb } from '@/lib/pb';
import { createProject } from '@/lib/projects';
import { projectsQuery } from '@/lib/queries';

export function ProjectsPage() {
  const me = useMe();
  const projects = useQuery(projectsQuery);
  const [creating, setCreating] = useState(false);

  return (
    <section>
      <header className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Проекты</h1>
        <Link to="/me" aria-label="Профиль" className="rounded-full">
          <Avatar name={me?.name ?? '?'} />
        </Link>
      </header>

      {projects.isPending && <Skeleton className="h-20 rounded-xl" />}
      {projects.isError && <p className="text-led-red">Проекты не загрузились.</p>}
      {projects.data?.length === 0 && (
        <div className="mb-4 rounded-xl border border-dashed p-6">
          <p className="font-medium">Проектов пока нет</p>
          <p className="mt-1 text-sm text-dim">
            Создайте проект для группы и добавьте в него участников: песни, ленты и находки живут
            внутри проекта.
          </p>
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {projects.data?.map((p) => {
          const people = [p.expand?.owner, ...(p.expand?.members ?? [])].filter(
            (u) => u !== undefined,
          );
          return (
            <li key={p.id}>
              <Link
                to="/p/$projectId/songs"
                params={{ projectId: p.id }}
                className="flex items-center gap-3 rounded-xl bg-panel p-4 active:bg-groove"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-lg font-medium">{p.name}</span>
                  <span className="block truncate text-sm text-dim">
                    {people.map((u) => u.name).join(', ')}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <Button className="mt-4 w-full" size="lg" onClick={() => setCreating(true)}>
        <Plus data-icon="inline-start" />
        Новый проект
      </Button>

      <NewProjectDrawer open={creating} onOpenChange={setCreating} />
    </section>
  );
}

function NewProjectDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const me = useMe();
  const client = useQueryClient();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [members, setMembers] = useState<string[]>([]);

  const create = useMutation({
    mutationFn: () => {
      if (!me) throw new Error('нет входа');
      return createProject(pb, { name, owner: me.id, members });
    },
    onSuccess: async (p) => {
      await client.invalidateQueries({ queryKey: ['projects'] });
      onOpenChange(false);
      setName('');
      setMembers([]);
      await navigate({ to: '/p/$projectId/songs', params: { projectId: p.id } });
    },
    onError: () => toast.error('Проект не создан: проверьте соединение'),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    if (name.trim()) create.mutate();
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <form
          onSubmit={submit}
          className="mx-auto flex w-full max-w-xl flex-col gap-4 overflow-y-auto px-4 pb-6"
        >
          <DrawerHeader className="px-0 text-left">
            <DrawerTitle className="text-lg">Новый проект</DrawerTitle>
            <DrawerDescription>Этапы песен возьмутся из стандартного шаблона.</DrawerDescription>
          </DrawerHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="project-name">Название</Label>
            <Input
              id="project-name"
              required
              maxLength={120}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">Участники</span>
            {me && (
              <MembersPicker
                ownerId={me.id}
                value={members}
                onChange={setMembers}
                disabled={create.isPending}
              />
            )}
          </div>
          <Button type="submit" size="lg" disabled={create.isPending || !name.trim()}>
            Создать проект
          </Button>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
