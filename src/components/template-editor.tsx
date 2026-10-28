import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Plus } from 'lucide-react';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { StageAddDrawer } from '@/components/stage-add-drawer';
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
import { Textarea } from '@/components/ui/textarea';
import type { StageTemplate } from '@/lib/model';
import { moved, savePositions } from '@/lib/order';
import { collection, pb } from '@/lib/pb';
import { templatesQuery } from '@/lib/queries';

// Шаблон этапов проекта: из него собираются новые песни. Уже созданные песни он не меняет.
export function TemplateEditor({ projectId }: { projectId: string }) {
  const templates = useQuery(templatesQuery(projectId));
  const [openId, setOpenId] = useState<string>();
  const [adding, setAdding] = useState(false);
  const list = templates.data ?? [];

  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-medium">Шаблон этапов новых песен</span>
      <ol className="text-sm">
        {list.map((t, i) => (
          <li key={t.id} className="border-b last:border-b-0">
            <button
              type="button"
              onClick={() => setOpenId(t.id)}
              className="flex min-h-11 w-full items-center gap-3 py-2 text-left active:bg-panel"
            >
              <span className="w-5 text-dim">{i + 1}</span>
              <span className="flex-1">
                {t.title}
                {(t.substeps ?? []).length > 0 && (
                  <span className="block text-xs text-dim">
                    подэтапов: {(t.substeps ?? []).length}
                  </span>
                )}
              </span>
              {t.optional && <span className="text-xs text-dim">необязательный</span>}
            </button>
          </li>
        ))}
      </ol>
      <Button variant="ghost" onClick={() => setAdding(true)}>
        <Plus data-icon="inline-start" />
        Добавить этап в шаблон
      </Button>
      <TemplateDrawer
        templates={list}
        template={list.find((t) => t.id === openId)}
        onOpenChange={(o) => !o && setOpenId(undefined)}
      />
      <StageAddDrawer
        target={{ project: projectId }}
        existing={list}
        open={adding}
        onOpenChange={setAdding}
      />
    </div>
  );
}

type DrawerProps = {
  templates: ReadonlyArray<StageTemplate>;
  template: StageTemplate | undefined;
  onOpenChange: (open: boolean) => void;
};

function TemplateDrawer({ templates, template, onOpenChange }: DrawerProps) {
  const client = useQueryClient();
  const [title, setTitle] = useState('');
  const [optional, setOptional] = useState(false);
  const [substeps, setSubsteps] = useState('');
  const [deleting, setDeleting] = useState(false);
  const id = template?.id;

  // при открытии - значения этапа шаблона; перечитанные во время правки данные черновик не трогают
  const templateRef = useRef(template);
  templateRef.current = template;
  useEffect(() => {
    const t = templateRef.current;
    if (!id || !t) return;
    setTitle(t.title);
    setOptional(t.optional);
    setSubsteps((t.substeps ?? []).join('\n'));
  }, [id]);

  const refresh = () => client.invalidateQueries({ queryKey: ['stage_templates'] });

  const save = useMutation({
    mutationFn: () => {
      if (!id) throw new Error('этап не выбран');
      return collection(pb, 'stage_templates').update(id, {
        title: title.trim(),
        optional,
        substeps: substeps
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
      });
    },
    onSuccess: async () => {
      onOpenChange(false);
      await refresh();
    },
    onError: () => toast.error('Не сохранилось: проверьте соединение'),
  });
  const move = useMutation({
    mutationFn: (step: -1 | 1) => {
      if (!id) throw new Error('этап не выбран');
      return savePositions(pb, 'stage_templates', moved(templates, id, step));
    },
    onSettled: refresh,
    onError: () => toast.error('Порядок не сохранился: проверьте соединение'),
  });
  const remove = useMutation({
    mutationFn: () => {
      if (!id) throw new Error('этап не выбран');
      return collection(pb, 'stage_templates').delete(id);
    },
    onSuccess: async () => {
      setDeleting(false);
      onOpenChange(false);
      await refresh();
    },
    onError: () => toast.error('Этап не удалён: проверьте соединение'),
  });

  const busy = save.isPending || move.isPending || remove.isPending;
  const index = templates.findIndex((t) => t.id === id);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (title.trim()) save.mutate();
  }

  return (
    <Drawer open={template !== undefined} onOpenChange={onOpenChange}>
      <DrawerContent>
        {template && (
          <form
            onSubmit={submit}
            className="mx-auto flex w-full max-w-xl flex-col gap-4 overflow-y-auto px-4 pb-6"
          >
            <DrawerHeader className="px-0 text-left">
              <DrawerTitle className="text-lg">Этап шаблона</DrawerTitle>
              <DrawerDescription>
                Изменения попадут в новые песни, уже созданные не тронут.
              </DrawerDescription>
            </DrawerHeader>
            <div className="flex flex-col gap-2">
              <Label htmlFor="tpl-title">Название</Label>
              <Input
                id="tpl-title"
                required
                maxLength={120}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <label htmlFor="tpl-optional" className="flex min-h-11 items-center gap-3">
              <Checkbox
                id="tpl-optional"
                className="size-5"
                checked={optional}
                onCheckedChange={(v) => setOptional(v === true)}
              />
              <span>Необязательный</span>
            </label>
            <div className="flex flex-col gap-2">
              <Label htmlFor="tpl-substeps">Подэтапы, по одному в строке</Label>
              <Textarea
                id="tpl-substeps"
                rows={5}
                value={substeps}
                onChange={(e) => setSubsteps(e.target.value)}
              />
            </div>
            <Button type="submit" size="lg" disabled={busy || !title.trim()}>
              Сохранить
            </Button>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={busy || index <= 0}
                onClick={() => move.mutate(-1)}
              >
                <ArrowUp data-icon="inline-start" />
                Выше
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={busy || index < 0 || index >= templates.length - 1}
                onClick={() => move.mutate(1)}
              >
                <ArrowDown data-icon="inline-start" />
                Ниже
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="ml-auto"
                disabled={busy}
                onClick={() => setDeleting(true)}
              >
                Удалить
              </Button>
            </div>
          </form>
        )}
        {template && (
          <ConfirmDialog
            open={deleting}
            onOpenChange={setDeleting}
            title={`Убрать «${template.title}» из шаблона?`}
            description="В новых песнях этого этапа не будет. Уже созданные песни не изменятся."
            confirm="Убрать из шаблона"
            busy={remove.isPending}
            onConfirm={() => remove.mutate()}
          />
        )}
      </DrawerContent>
    </Drawer>
  );
}
