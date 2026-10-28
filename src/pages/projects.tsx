import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { ProjectAvatar } from '@/components/images';
import { MembersPicker } from '@/components/members-picker';
import { EmptyState, GROUP, PageHeader } from '@/components/page';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useMe } from '@/lib/auth';
import { pb } from '@/lib/pb';
import { createProject } from '@/lib/projects';
import { projectsQuery } from '@/lib/queries';
import { cn } from '@/lib/utils';

export function ProjectsPage() {
  const projects = useQuery(projectsQuery);
  const { create } = useSearch({ from: '/app/projects' });
  const navigate = useNavigate();
  const setCreating = (open: boolean) =>
    void navigate({ to: '/projects', search: open ? { create: true } : {}, replace: true });

  return (
    <>
      <PageHeader
        crumbs={[]}
        title="Проекты"
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus data-icon="inline-start" />
            Новый проект
          </Button>
        }
      />
      {projects.isPending && <Skeleton className="h-20 rounded-xl" />}
      {projects.isError && !projects.data && (
        <p className="text-led-red">Проекты не загрузились.</p>
      )}
      {projects.data?.length === 0 && <EmptyState>Проектов пока нет</EmptyState>}
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {projects.data?.map((p) => {
          const people = [p.expand?.owner, ...(p.expand?.members ?? [])].filter(
            (u) => u !== undefined,
          );
          return (
            <li key={p.id}>
              <Link
                to="/p/$projectId"
                params={{ projectId: p.id }}
                className={cn(
                  GROUP,
                  'flex items-center gap-4 p-4 transition-colors hover:bg-groove/40 active:bg-groove/70',
                )}
              >
                <ProjectAvatar project={p} className="size-12 rounded-xl text-lg" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{p.name}</span>
                  <span className="block truncate text-sm text-dim">
                    {people.map((u) => u.name).join(', ')}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <NewProjectDialog open={create === true} onOpenChange={setCreating} />
    </>
  );
}

function NewProjectDialog({
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
      setName('');
      setMembers([]);
      await navigate({ to: '/p/$projectId', params: { projectId: p.id } });
    },
    onError: () => toast.error('Проект не создан: проверьте соединение'),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    if (name.trim() && !create.isPending) create.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Новый проект</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="project-name">Название</Label>
            <Input
              id="project-name"
              required
              autoFocus
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
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={create.isPending || !name.trim()}>
              Создать
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
