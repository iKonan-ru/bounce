import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { type FormEvent, useState } from 'react';
import { toast } from 'sonner';
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
import { pb } from '@/lib/pb';
import { templatesQuery } from '@/lib/queries';
import { queryKeys } from '@/lib/query-keys';
import { createSong } from '@/lib/songs';

// Новая песня: только название, этапы - из шаблона проекта, остальное - в настройках песни.
export function NewSongDialog({
  projectId,
  open,
  onOpenChange,
}: {
  projectId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const client = useQueryClient();
  const navigate = useNavigate();
  const templates = useQuery(templatesQuery(projectId));
  const [title, setTitle] = useState('');

  const create = useMutation({
    mutationFn: () => createSong(pb, projectId, title, templates.data ?? []),
    onSuccess: async (song) => {
      await client.invalidateQueries({ queryKey: queryKeys.songs.all });
      onOpenChange(false);
      setTitle('');
      await navigate({ to: '/p/$projectId/songs/$songId', params: { projectId, songId: song.id } });
    },
    onError: () => toast.error('Песня не создана: проверьте соединение'),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    if (title.trim() && !create.isPending) create.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Новая песня</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-song-title">Название</Label>
            <Input
              id="new-song-title"
              required
              autoFocus
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={!title.trim() || create.isPending || templates.isPending}
            >
              Создать
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
