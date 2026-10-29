import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
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
import type { Note } from '@/lib/model';
import { pb } from '@/lib/pb';
import { templatesQuery } from '@/lib/queries';
import { queryKeys } from '@/lib/query-keys';
import { songFromNote, titleFromNote } from '@/lib/songs';

// "Сделать песней": окно с названием; шаблон этапов грузится, только когда окно открыли.
export function MakeSongDialog({ note, onClose }: { note: Note; onClose: () => void }) {
  const client = useQueryClient();
  const navigate = useNavigate();
  const [songTitle, setSongTitle] = useState(() => titleFromNote(note.text));
  const templates = useQuery(templatesQuery(note.project));
  const makeSong = useMutation({
    mutationFn: () => songFromNote(pb, note, songTitle.trim(), templates.data ?? []),
    onSuccess: async (song) => {
      onClose();
      await Promise.all([
        client.invalidateQueries({ queryKey: queryKeys.notes.all }),
        client.invalidateQueries({ queryKey: queryKeys.songs.all }),
      ]);
      await navigate({
        to: '/p/$projectId/songs/$songId',
        params: { projectId: note.project, songId: song.id },
      });
    },
    onError: () => toast.error('Песня не создана: проверьте соединение'),
  });
  const busy = makeSong.isPending;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (songTitle.trim()) makeSong.mutate();
          }}
        >
          <DialogHeader>
            <DialogTitle>Новая песня</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`song-from-${note.id}`}>Название</Label>
            <Input
              id={`song-from-${note.id}`}
              required
              autoFocus
              maxLength={200}
              value={songTitle}
              onChange={(e) => setSongTitle(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" disabled={busy} onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" disabled={busy || !songTitle.trim() || templates.isPending}>
              Создать
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
