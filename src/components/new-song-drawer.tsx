import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { type FormEvent, useState } from 'react';
import { toast } from 'sonner';
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
import { pb } from '@/lib/pb';
import { templatesQuery } from '@/lib/queries';
import { createSong } from '@/lib/songs';

type Props = { projectId: string; open: boolean; onOpenChange: (open: boolean) => void };

export function NewSongDrawer({ projectId, open, onOpenChange }: Props) {
  const client = useQueryClient();
  const navigate = useNavigate();
  const templates = useQuery(templatesQuery(projectId));
  const [title, setTitle] = useState('');
  const [bpm, setBpm] = useState('');
  const [key, setKey] = useState('');

  const create = useMutation({
    mutationFn: () => {
      const n = Number.parseInt(bpm, 10);
      return createSong(
        pb,
        projectId,
        { title, key, ...(Number.isFinite(n) ? { bpm: n } : {}) },
        templates.data ?? [],
      );
    },
    onSuccess: async (song) => {
      await client.invalidateQueries({ queryKey: ['songs'] });
      onOpenChange(false);
      setTitle('');
      setBpm('');
      setKey('');
      await navigate({ to: '/p/$projectId/songs/$songId', params: { projectId, songId: song.id } });
    },
    onError: () => toast.error('Песня не создана: проверьте соединение и попробуйте ещё раз'),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    if (title.trim()) create.mutate();
  }

  const stageCount = templates.data?.length ?? 0;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <form onSubmit={submit} className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 pb-6">
          <DrawerHeader className="px-0 text-left">
            <DrawerTitle className="text-lg">Новая песня</DrawerTitle>
            <DrawerDescription>
              {stageCount > 0
                ? `Этапы подставятся из шаблона: ${stageCount}.`
                : 'Этапы подставятся из шаблона.'}
            </DrawerDescription>
          </DrawerHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="song-title">Название</Label>
            <Input
              id="song-title"
              required
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="song-bpm">BPM</Label>
              <Input
                id="song-bpm"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={3}
                value={bpm}
                onChange={(e) => setBpm(e.target.value.replace(/\D/g, ''))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="song-key">Тональность</Label>
              <Input
                id="song-key"
                maxLength={20}
                placeholder="Am"
                value={key}
                onChange={(e) => setKey(e.target.value)}
              />
            </div>
          </div>
          <Button
            type="submit"
            size="lg"
            disabled={create.isPending || templates.isPending || !title.trim()}
          >
            Добавить песню
          </Button>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
