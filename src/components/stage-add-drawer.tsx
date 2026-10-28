import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { nextPosition } from '@/lib/order';
import { collection, pb } from '@/lib/pb';

type Props = {
  // куда: этап песни (song) или этап шаблона проекта (project)
  target: { song: string } | { project: string };
  existing: ReadonlyArray<{ id: string; position: number }>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function StageAddDrawer({ target, existing, open, onOpenChange }: Props) {
  const client = useQueryClient();
  const [title, setTitle] = useState('');
  const [optional, setOptional] = useState(false);
  const toSong = 'song' in target;

  const add = useMutation({
    mutationFn: async () => {
      const base = { title: title.trim(), optional, position: nextPosition(existing) };
      if ('song' in target) {
        await collection(pb, 'song_stages').create({
          ...base,
          song: target.song,
          status: 'not_started',
          substeps: [],
        });
      } else {
        await collection(pb, 'stage_templates').create({
          ...base,
          project: target.project,
          substeps: [],
        });
      }
    },
    onSuccess: async () => {
      setTitle('');
      setOptional(false);
      onOpenChange(false);
      await client.invalidateQueries({ queryKey: [toSong ? 'songs' : 'stage_templates'] });
    },
    onError: () => toast.error('Этап не добавлен: проверьте соединение'),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    if (title.trim()) add.mutate();
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <form onSubmit={submit} className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 pb-6">
          <DrawerHeader className="px-0 text-left">
            <DrawerTitle className="text-lg">Новый этап</DrawerTitle>
            <DrawerDescription>
              {toSong
                ? 'Встанет в конец списка этой песни.'
                : 'Встанет в конец шаблона и появится в новых песнях.'}
            </DrawerDescription>
          </DrawerHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="stage-title">Название</Label>
            <Input
              id="stage-title"
              required
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <label htmlFor="stage-optional" className="flex min-h-11 items-center gap-3">
            <Checkbox
              id="stage-optional"
              className="size-5"
              checked={optional}
              onCheckedChange={(v) => setOptional(v === true)}
            />
            <span>Необязательный</span>
          </label>
          <Button type="submit" size="lg" disabled={add.isPending || !title.trim()}>
            Добавить этап
          </Button>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
