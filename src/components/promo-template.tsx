import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { AddRow } from '@/components/add-inline';
import { AutosaveInput } from '@/components/autosave-input';
import { Collapse } from '@/components/collapse';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { GROUP_ROWS, Section } from '@/components/page';
import { Segmented } from '@/components/segmented';
import { ServiceIcon } from '@/components/service-icon';
import { Button } from '@/components/ui/button';
import type { PromoStep } from '@/lib/model';
import { collection, pb } from '@/lib/pb';
import { offsetLabel } from '@/lib/posts';
import { promoQuery } from '@/lib/queries';
import { POST_PLATFORMS, serviceById } from '@/lib/services';
import { cn } from '@/lib/utils';

type Patch = Partial<Pick<PromoStep, 'title' | 'offset' | 'platforms'>>;
type When = 'before' | 'day' | 'after';

const MAX_DAYS = 365;

function whenOf(offset: number): When {
  return offset < 0 ? 'before' : offset > 0 ? 'after' : 'day';
}

// Промо-план проекта: какие публикации кнопка "Добавить промо-план" создаст у песни и когда
// относительно релиза. Правят редакторы и владелец, как этапы новых песен.
export function PromoTemplate({ projectId, editable }: { projectId: string; editable: boolean }) {
  const client = useQueryClient();
  const key = promoQuery(projectId).queryKey;
  const steps = useQuery(promoQuery(projectId));
  const [open, setOpen] = useState<string>();
  const refresh = () => client.invalidateQueries({ queryKey: ['promo_templates', projectId] });

  const add = useMutation({
    mutationFn: (title: string) =>
      collection(pb, 'promo_templates').create<PromoStep>({
        project: projectId,
        title,
        offset: 0,
        platforms: [],
      }),
    onSuccess: async (step) => {
      await refresh();
      setOpen(step.id);
    },
    onError: () => toast.error('Не сохранилось: проверьте соединение'),
  });
  const save = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Patch }) =>
      collection(pb, 'promo_templates').update(id, patch),
    // выбор виден сразу, не дожидаясь сервера
    onMutate: ({ id, patch }) =>
      client.setQueryData<PromoStep[]>(key, (old) =>
        old?.map((s) => (s.id === id ? { ...s, ...patch } : s)),
      ),
    onSettled: refresh,
    onError: () => toast.error('Не сохранилось: проверьте соединение'),
  });
  const remove = useMutation({
    mutationFn: (id: string) => collection(pb, 'promo_templates').delete(id),
    onSuccess: refresh,
    onError: () => toast.error('Не удалилось: проверьте соединение'),
  });

  const list = [...(steps.data ?? [])].sort((a, b) => (a.offset ?? 0) - (b.offset ?? 0));

  return (
    <Section title="Промо-план">
      <div className={GROUP_ROWS}>
        {list.map((s) => (
          <PromoRow
            key={s.id}
            step={s}
            editable={editable}
            open={open === s.id}
            onToggle={() => setOpen(open === s.id ? undefined : s.id)}
            onSave={(patch) => save.mutate({ id: s.id, patch })}
            onRemove={() => remove.mutate(s.id)}
          />
        ))}
        {steps.isSuccess && list.length === 0 && !editable && (
          <p className="px-4 py-3 text-sm text-dim">Публикаций нет</p>
        )}
        {editable && (
          <AddRow
            id="new-promo-step"
            label="Добавить публикацию"
            maxLength={300}
            busy={add.isPending}
            onAdd={(t) => add.mutateAsync(t)}
          />
        )}
      </div>
    </Section>
  );
}

function PromoRow({
  step,
  editable,
  open,
  onToggle,
  onSave,
  onRemove,
}: {
  step: PromoStep;
  editable: boolean;
  open: boolean;
  onToggle: () => void;
  onSave: (patch: Patch) => void;
  onRemove: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const offset = step.offset ?? 0;
  const platforms = step.platforms ?? [];
  const when = whenOf(offset);
  const days = Math.abs(offset);

  const head = (
    <>
      <span className="min-w-0 flex-1">
        <span className="block truncate">{step.title}</span>
        <span className="block text-sm text-dim">{offsetLabel(offset)}</span>
      </span>
      <span className="flex shrink-0 items-center gap-1 text-dim">
        {platforms.flatMap((id) => {
          const s = serviceById(POST_PLATFORMS, id);
          return s ? [<ServiceIcon key={id} service={s} className="size-3.5" />] : [];
        })}
      </span>
    </>
  );

  if (!editable) {
    return <div className="flex min-h-14 items-center gap-3 px-4 py-2">{head}</div>;
  }

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-groove/30"
      >
        {head}
        <ChevronRight
          className={cn('size-4 shrink-0 text-dim/60 transition-transform', open && 'rotate-90')}
        />
      </button>
      <Collapse open={open}>
        <div className="flex flex-col gap-3 bg-console/50 px-4 pt-2 pb-4 dark:bg-console/40">
          <div className="flex items-center gap-2">
            <span className="w-24 shrink-0 text-sm text-dim">Название</span>
            <AutosaveInput
              id={`promo-title-${step.id}`}
              required
              maxLength={300}
              value={step.title}
              className="text-left"
              onSave={(title) => onSave({ title })}
            />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm text-dim">Когда</span>
            <Segmented
              label="Когда"
              value={when}
              onChange={(w) =>
                onSave({ offset: w === 'day' ? 0 : (w === 'before' ? -1 : 1) * Math.max(1, days) })
              }
              options={[
                { value: 'before', label: 'До релиза' },
                { value: 'day', label: 'В день' },
                { value: 'after', label: 'После' },
              ]}
              className="bg-panel ring-1 ring-border/70 dark:ring-border/40"
            />
            {when !== 'day' && (
              <div className="flex items-center gap-2">
                <AutosaveInput
                  id={`promo-days-${step.id}`}
                  inputMode="numeric"
                  maxLength={3}
                  value={String(days)}
                  filter={(v) => v.replace(/\D/g, '')}
                  validate={(v) => Number(v) >= 1 && Number(v) <= MAX_DAYS}
                  onSave={(v) => onSave({ offset: (when === 'before' ? -1 : 1) * Number(v) })}
                  className="w-16 bg-panel text-center ring-1 ring-border/70 dark:ring-border/40"
                />
                <span className="text-sm text-dim">{offsetLabel(offset)}</span>
              </div>
            )}
          </div>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm text-dim">Площадки</legend>
            <div className="flex flex-wrap gap-1.5">
              {POST_PLATFORMS.map((s) => {
                const on = platforms.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      onSave({
                        platforms: on
                          ? platforms.filter((p) => p !== s.id)
                          : POST_PLATFORMS.map((x) => x.id).filter(
                              (id) => id === s.id || platforms.includes(id),
                            ),
                      })
                    }
                    className={cn(
                      'flex h-9 items-center gap-1.5 rounded-full px-3 text-sm ring-1 transition-colors',
                      on
                        ? 'bg-tape text-tape-ink ring-transparent'
                        : 'text-dim ring-border/70 hover:text-ink dark:ring-border/40',
                    )}
                  >
                    <ServiceIcon service={s} className="size-4" />
                    {s.name}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="-ml-2 h-9 px-2 text-led-red hover:bg-led-red/10 hover:text-led-red"
              onClick={() => setConfirming(true)}
            >
              <Trash2 data-icon="inline-start" />
              Убрать из промо-плана
            </Button>
          </div>
        </div>
      </Collapse>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Убрать "${step.title}" из промо-плана?`}
        description="Публикации, которые уже созданы у песен, не изменятся."
        confirm="Убрать"
        onConfirm={() => {
          setConfirming(false);
          onRemove();
        }}
      />
    </div>
  );
}
