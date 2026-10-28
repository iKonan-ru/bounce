import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';
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
import { fromDateInput, toDateInput } from '@/lib/format';
import { SONG_STATUS_LABEL, type Song, type SongStatus } from '@/lib/model';
import { collection, pb } from '@/lib/pb';
import { cn } from '@/lib/utils';

const STATUSES: SongStatus[] = ['active', 'paused', 'done', 'released'];

type Props = { song: Song; open: boolean; onOpenChange: (open: boolean) => void };

export function SongEditDrawer({ song, open, onOpenChange }: Props) {
  const client = useQueryClient();
  const navigate = useNavigate();
  const [title, setTitle] = useState(song.title);
  const [bpm, setBpm] = useState('');
  const [key, setKey] = useState('');
  const [status, setStatus] = useState<SongStatus>(song.status);
  const [release, setRelease] = useState('');
  const [deleting, setDeleting] = useState(false);

  // при каждом открытии - текущие значения песни; правка соавтора черновик не сбрасывает
  const songRef = useRef(song);
  songRef.current = song;
  useEffect(() => {
    const s = songRef.current;
    if (!open) return;
    setTitle(s.title);
    setBpm(s.bpm > 0 ? String(s.bpm) : '');
    setKey(s.key);
    setStatus(s.status);
    setRelease(toDateInput(s.target_release));
  }, [open]);

  const save = useMutation({
    mutationFn: () => {
      const n = Number.parseInt(bpm, 10);
      return collection(pb, 'songs').update(song.id, {
        title: title.trim(),
        bpm: Number.isFinite(n) ? n : null,
        key: key.trim(),
        status,
        target_release: fromDateInput(release),
      });
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['songs'] });
      onOpenChange(false);
    },
    onError: () => toast.error('Не сохранилось: проверьте BPM (20-400) и соединение'),
  });

  const remove = useMutation({
    mutationFn: () => collection(pb, 'songs').delete(song.id),
    onSuccess: async () => {
      setDeleting(false);
      onOpenChange(false);
      await navigate({ to: '/p/$projectId/songs', params: { projectId: song.project } });
      await client.invalidateQueries({ queryKey: ['songs'] });
    },
    onError: () => toast.error('Песня не удалена: проверьте соединение'),
  });

  const busy = save.isPending || remove.isPending;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (title.trim()) save.mutate();
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <form
          onSubmit={submit}
          className="mx-auto flex w-full max-w-xl flex-col gap-4 overflow-y-auto px-4 pb-6"
        >
          <DrawerHeader className="px-0 text-left">
            <DrawerTitle className="text-lg">Песня</DrawerTitle>
            <DrawerDescription className="sr-only">
              Название, темп, статус, дата релиза
            </DrawerDescription>
          </DrawerHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-title">Название</Label>
            <Input
              id="edit-title"
              required
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-bpm">BPM</Label>
              <Input
                id="edit-bpm"
                inputMode="numeric"
                maxLength={3}
                value={bpm}
                onChange={(e) => setBpm(e.target.value.replace(/\D/g, ''))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-key">Тональность</Label>
              <Input
                id="edit-key"
                maxLength={20}
                value={key}
                onChange={(e) => setKey(e.target.value)}
              />
            </div>
          </div>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">Статус</legend>
            <div className="grid grid-cols-2 gap-2">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={status === s}
                  onClick={() => setStatus(s)}
                  className={cn(
                    'h-11 rounded-lg border px-3 text-sm transition-colors',
                    status === s ? 'border-ink/40 bg-groove text-ink' : 'text-dim active:bg-groove',
                  )}
                >
                  {SONG_STATUS_LABEL[s]}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-release">Целевая дата релиза</Label>
            <Input
              id="edit-release"
              type="date"
              value={release}
              onChange={(e) => setRelease(e.target.value)}
            />
          </div>
          <Button type="submit" size="lg" disabled={busy || !title.trim()}>
            Сохранить
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={busy}
            onClick={() => setDeleting(true)}
          >
            Удалить песню
          </Button>
        </form>
        <ConfirmDialog
          open={deleting}
          onOpenChange={setDeleting}
          title={`Удалить «${song.title}»?`}
          description="Удалятся этапы, текст, лента песни и её файлы. Вернуть их будет нельзя."
          confirm="Удалить песню"
          busy={remove.isPending}
          onConfirm={() => remove.mutate()}
        />
      </DrawerContent>
    </Drawer>
  );
}
