import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, X } from 'lucide-react';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';
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
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { useMe } from '@/lib/auth';
import {
  CATEGORIES,
  CATEGORY_LABEL,
  type Category,
  INSTRUMENT_LABEL,
  INSTRUMENTS,
  type Instrument,
  parseTags,
  saveFinding,
} from '@/lib/findings';
import { fileSize, noteDate } from '@/lib/format';
import { type Finding, MAX_IMAGE_BYTES, MAX_IMAGE_FILES } from '@/lib/model';
import { collection, pb } from '@/lib/pb';
import { fileTokenQuery, songsQuery, stagesOf } from '@/lib/queries';

// нативный select: на телефоне - системный список, без лишних слоёв
const SELECT =
  'h-11 w-full rounded-lg border border-input bg-transparent px-3 text-base dark:bg-input/30';

export type FindingDraft = { song?: string; stage?: string };

type Props = {
  projectId: string;
  // открыта: правка находки или новая (с песней и этапом, если пришли из этапа)
  state: { finding: Finding } | { draft: FindingDraft } | null;
  onClose: () => void;
};

export function FindingDrawer({ projectId, state, onClose }: Props) {
  const me = useMe();
  const client = useQueryClient();
  const token = useQuery(fileTokenQuery);
  const songs = useQuery(songsQuery(projectId));
  const imageInput = useRef<HTMLInputElement>(null);
  const finding = state && 'finding' in state ? state.finding : undefined;

  const [title, setTitle] = useState('');
  const [instrument, setInstrument] = useState<Instrument | ''>('');
  const [category, setCategory] = useState<Category | ''>('');
  const [settings, setSettings] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [library, setLibrary] = useState(false);
  const [song, setSong] = useState('');
  const [stage, setStage] = useState('');
  const [newImages, setNewImages] = useState<File[]>([]);
  const [removeImages, setRemoveImages] = useState<string[]>([]);
  const [progress, setProgress] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // при открытии - значения находки или пустая форма с песней и этапом из шторки этапа; данные
  // находки, перечитанные во время правки, черновик не сбрасывают
  const openKey = !state
    ? ''
    : 'finding' in state
      ? state.finding.id
      : `new:${state.draft.song ?? ''}:${state.draft.stage ?? ''}`;
  const stateRef = useRef(state);
  stateRef.current = state;
  useEffect(() => {
    const state = stateRef.current;
    if (!openKey || !state) return;
    const f = 'finding' in state ? state.finding : undefined;
    const d = 'draft' in state ? state.draft : {};
    setTitle(f?.title ?? '');
    setInstrument(f?.instrument ?? '');
    setCategory(f?.category ?? '');
    setSettings(f?.settings ?? '');
    setDescription(f?.description ?? '');
    setTags((f?.tags ?? []).join(', '));
    setLibrary(f?.library ?? false);
    setSong(f?.song ?? d.song ?? '');
    setStage(f?.stage ?? d.stage ?? '');
    setNewImages([]);
    setRemoveImages([]);
    setProgress(null);
  }, [openKey]);

  const songStages = songs.data?.find((s) => s.id === song);
  const stageOptions = songStages ? stagesOf(songStages) : [];

  const save = useMutation({
    mutationFn: () => {
      if (!me) throw new Error('нет входа');
      setProgress(newImages.length > 0 ? 0 : null);
      return saveFinding(
        pb,
        finding ? { id: finding.id } : { project: projectId, author: me.id },
        {
          title,
          description,
          settings,
          instrument,
          category,
          tags: parseTags(tags),
          library,
          song,
          stage: song ? stage : '',
          newImages,
          removeImages,
        },
        newImages.length > 0 ? setProgress : undefined,
      );
    },
    onSuccess: async () => {
      onClose();
      await client.invalidateQueries({ queryKey: ['findings'] });
    },
    onError: () => {
      setProgress(null);
      toast.error('Находка не сохранена: проверьте соединение и размер изображений');
    },
  });

  const remove = useMutation({
    mutationFn: () => {
      if (!finding) throw new Error('нет находки');
      return collection(pb, 'findings').delete(finding.id);
    },
    onSuccess: async () => {
      setDeleting(false);
      onClose();
      await client.invalidateQueries({ queryKey: ['findings'] });
    },
    onError: () => toast.error('Находка не удалена: проверьте соединение'),
  });

  const busy = save.isPending || remove.isPending;
  const kept = (finding?.images ?? []).filter((f) => !removeImages.includes(f));

  function addImages(list: FileList | null) {
    const picked = Array.from(list ?? []);
    const ok = picked.filter((f) => f.size <= MAX_IMAGE_BYTES);
    if (ok.length < picked.length)
      toast.error(`Изображения больше ${fileSize(MAX_IMAGE_BYTES)} не загрузить`);
    const room = MAX_IMAGE_FILES - kept.length - newImages.length;
    if (ok.length > room) toast.error(`Не больше ${MAX_IMAGE_FILES} изображений в находке`);
    setNewImages([...newImages, ...ok.slice(0, Math.max(0, room))]);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (title.trim()) save.mutate();
  }

  return (
    <Drawer open={state !== null} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent>
        {state && (
          <form
            onSubmit={submit}
            className="mx-auto flex w-full max-w-xl flex-col gap-4 overflow-y-auto px-4 pb-6"
          >
            <DrawerHeader className="px-0 text-left">
              <DrawerTitle className="text-lg">{finding ? 'Находка' : 'Новая находка'}</DrawerTitle>
              <DrawerDescription>
                {finding
                  ? `${finding.expand?.author?.name ?? 'Участник'}, ${noteDate(finding.created)}`
                  : 'Что сработало: настройка, подход, приём.'}
              </DrawerDescription>
            </DrawerHeader>

            <div className="flex flex-col gap-2">
              <Label htmlFor="f-title">Заголовок</Label>
              <Input
                id="f-title"
                required
                maxLength={200}
                placeholder="Бас через Ampeg без компрессора"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="f-instrument">Инструмент</Label>
                <select
                  id="f-instrument"
                  className={SELECT}
                  value={instrument}
                  onChange={(e) => {
                    const v = INSTRUMENTS.find((x) => x === e.target.value);
                    setInstrument(v ?? '');
                  }}
                >
                  <option value="">Не указан</option>
                  {INSTRUMENTS.map((i) => (
                    <option key={i} value={i}>
                      {INSTRUMENT_LABEL[i]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="f-category">Категория</Label>
                <select
                  id="f-category"
                  className={SELECT}
                  value={category}
                  onChange={(e) => {
                    const v = CATEGORIES.find((x) => x === e.target.value);
                    setCategory(v ?? '');
                  }}
                >
                  <option value="">Не указана</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_LABEL[c]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="f-settings">Значения настроек</Label>
              <Textarea
                id="f-settings"
                rows={3}
                placeholder="Gain 3, Bass 6, Presence 7"
                value={settings}
                onChange={(e) => setSettings(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="f-description">Описание</Label>
              <Textarea
                id="f-description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Снимки экрана</span>
              {(kept.length > 0 || newImages.length > 0) && (
                <div className="grid grid-cols-3 gap-1.5">
                  {finding &&
                    kept.map((f) => (
                      <div
                        key={f}
                        className="relative aspect-square overflow-hidden rounded-md bg-groove"
                      >
                        {token.data && (
                          <img
                            src={pb.files.getURL(finding, f, { thumb: '480x0', token: token.data })}
                            alt=""
                            className="size-full object-cover"
                          />
                        )}
                        <button
                          type="button"
                          aria-label="Убрать изображение"
                          disabled={busy}
                          onClick={() => setRemoveImages([...removeImages, f])}
                          className="absolute top-1 right-1 flex size-7 items-center justify-center rounded-full bg-black/60 text-white"
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                    ))}
                  {newImages.map((f, i) => (
                    <div
                      key={`${f.name}-${f.size}-${f.lastModified}`}
                      className="relative aspect-square overflow-hidden rounded-md bg-groove"
                    >
                      <LocalImage file={f} />
                      <button
                        type="button"
                        aria-label={`Убрать ${f.name}`}
                        disabled={busy}
                        onClick={() => setNewImages(newImages.filter((_, j) => j !== i))}
                        className="absolute top-1 right-1 flex size-7 items-center justify-center rounded-full bg-black/60 text-white"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <input
                ref={imageInput}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => {
                  addImages(e.target.files);
                  e.target.value = '';
                }}
              />
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() => imageInput.current?.click()}
              >
                <ImagePlus data-icon="inline-start" />
                Добавить снимок
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="f-song">Песня</Label>
                <select
                  id="f-song"
                  className={SELECT}
                  value={song}
                  onChange={(e) => {
                    setSong(e.target.value);
                    setStage('');
                  }}
                >
                  <option value="">Общая находка</option>
                  {songs.data?.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="f-stage">Этап</Label>
                <select
                  id="f-stage"
                  className={SELECT}
                  value={stage}
                  disabled={!song}
                  onChange={(e) => setStage(e.target.value)}
                >
                  <option value="">Без этапа</option>
                  {stageOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="f-tags">Теги через запятую</Label>
              <Input
                id="f-tags"
                autoCapitalize="none"
                placeholder="тёплый, дабл, ламповый"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
            </div>
            <label htmlFor="f-library" className="flex min-h-11 items-center gap-3">
              <Checkbox
                id="f-library"
                className="size-5"
                checked={library}
                onCheckedChange={(v) => setLibrary(v === true)}
              />
              <span>В библиотеку: применять в других песнях</span>
            </label>

            {progress !== null && (
              <Progress value={Math.round(progress * 100)} aria-label="Загрузка снимков" />
            )}
            <Button type="submit" size="lg" disabled={busy || !title.trim()}>
              {save.isPending && progress !== null
                ? `Загрузка ${Math.round(progress * 100)}%`
                : 'Сохранить'}
            </Button>
            {finding && (
              <Button
                type="button"
                variant="destructive"
                disabled={busy}
                onClick={() => setDeleting(true)}
              >
                Удалить находку
              </Button>
            )}
          </form>
        )}
        {finding && (
          <ConfirmDialog
            open={deleting}
            onOpenChange={setDeleting}
            title="Удалить находку?"
            description="Вместе с ней удалятся снимки экрана."
            confirm="Удалить"
            busy={remove.isPending}
            onConfirm={() => remove.mutate()}
          />
        )}
      </DrawerContent>
    </Drawer>
  );
}

// превью выбранного, но ещё не загруженного снимка
function LocalImage({ file }: { file: File }) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return url ? <img src={url} alt={file.name} className="size-full object-cover" /> : null;
}
