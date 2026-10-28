import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from '@tanstack/react-router';
import { type FormEvent, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Avatar } from '@/components/avatar';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { MembersPicker } from '@/components/members-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMe } from '@/lib/auth';
import { collection, pb } from '@/lib/pb';
import { projectQuery, templatesQuery } from '@/lib/queries';

export function ProjectSettingsPage() {
  const { projectId } = useParams({ from: '/app/p/$projectId/settings' });
  const me = useMe();
  const client = useQueryClient();
  const navigate = useNavigate();
  const project = useQuery(projectQuery(projectId));
  const templates = useQuery(templatesQuery(projectId));
  const [name, setName] = useState('');
  const [members, setMembers] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);

  const p = project.data;
  const isOwner = p !== undefined && me?.id === p.owner;

  // черновик формы - из проекта; правка другим участником в реальном времени его обновит
  const savedName = p?.name ?? '';
  const savedMembers = p?.members.join(',') ?? '';
  useEffect(() => {
    setName(savedName);
    setMembers(savedMembers ? savedMembers.split(',') : []);
  }, [savedName, savedMembers]);

  const save = useMutation({
    mutationFn: () => collection(pb, 'projects').update(projectId, { name: name.trim(), members }),
    onSuccess: async () => {
      toast.success('Сохранено');
      await client.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: () => toast.error('Не сохранилось: проверьте соединение'),
  });

  const remove = useMutation({
    mutationFn: () => collection(pb, 'projects').delete(projectId),
    onSuccess: async () => {
      setDeleting(false);
      await client.invalidateQueries({ queryKey: ['projects'] });
      await navigate({ to: '/projects' });
    },
    onError: () => toast.error('Проект не удалён: проверьте соединение'),
  });

  if (!p) return null;

  const changed = name.trim() !== p.name || members.join(',') !== p.members.join(',');

  function submit(e: FormEvent) {
    e.preventDefault();
    if (changed && name.trim()) save.mutate();
  }

  const busy = save.isPending || remove.isPending;

  return (
    <section className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold tracking-tight">Проект</h1>

      {isOwner ? (
        <form onSubmit={submit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="project-name">Название</Label>
            <Input
              id="project-name"
              required
              maxLength={120}
              value={name}
              disabled={busy}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">Участники</span>
            <MembersPicker
              ownerId={p.owner}
              value={members}
              onChange={setMembers}
              disabled={busy}
            />
          </div>
          <Button type="submit" disabled={busy || !changed || !name.trim()}>
            Сохранить
          </Button>
        </form>
      ) : (
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium">Участники</span>
          <ul>
            {[p.expand?.owner, ...(p.expand?.members ?? [])].map(
              (u) =>
                u && (
                  <li key={u.id} className="flex items-center gap-3 py-2">
                    <Avatar name={u.name} />
                    <span className="flex-1">{u.name}</span>
                    {u.id === p.owner && <span className="text-xs text-dim">владелец</span>}
                  </li>
                ),
            )}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">Шаблон этапов новых песен</span>
        <ol className="text-sm">
          {templates.data?.map((t) => (
            <li key={t.id} className="flex gap-3 border-b py-2 last:border-b-0">
              <span className="w-5 text-dim">{t.position + 1}</span>
              <span className="flex-1">{t.title}</span>
              {t.optional && <span className="text-xs text-dim">необязательный</span>}
            </li>
          ))}
        </ol>
      </div>

      {isOwner && (
        <>
          <Button variant="destructive" disabled={busy} onClick={() => setDeleting(true)}>
            Удалить проект
          </Button>
          <ConfirmDialog
            open={deleting}
            onOpenChange={setDeleting}
            title={`Удалить \u00ab${p.name}\u00bb?`}
            description="Удалятся все песни, этапы, ленты, находки и файлы проекта. Вернуть их будет нельзя."
            confirm="Удалить проект"
            busy={remove.isPending}
            onConfirm={() => remove.mutate()}
          />
        </>
      )}
    </section>
  );
}
