import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, Minus, Plus, Sparkles, Trash2 } from 'lucide-react';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Collapse } from '@/components/collapse';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DateField } from '@/components/date-field';
import { MentionText, useMentionPeople, useMentions } from '@/components/mentions';
import { MenuSelect } from '@/components/menu-select';
import { EmptyState, GROUP, GROUP_ROWS, Section } from '@/components/page';
import { AvatarStack, PeoplePicker } from '@/components/people-picker';
import { Due, usePeople } from '@/components/plan-bits';
import { PropRow } from '@/components/prop-row';
import { Segmented } from '@/components/segmented';
import { ServiceIcon } from '@/components/service-icon';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { dateLabel } from '@/lib/format';
import { mentionedIds } from '@/lib/mentions';
import { POST_STATUS_LABEL, POST_STATUSES, type Post, type Song } from '@/lib/model';
import { collection, pb } from '@/lib/pb';
import { BUCKET_LABEL, BUCKETS, bucketOf } from '@/lib/plan';
import {
  createPost,
  offsetLabel,
  POST_STATUS_DOT,
  type PostPatch,
  postDate,
  updatePost,
} from '@/lib/posts';
import { postsQuery, promoQuery, songsQuery } from '@/lib/queries';
import { POST_PLATFORMS, serviceById } from '@/lib/services';
import { cn } from '@/lib/utils';

function StatusDot({ post }: { post: Pick<Post, 'status'> }) {
  return (
    <span
      aria-hidden="true"
      className={cn('size-2.5 shrink-0 rounded-full', POST_STATUS_DOT[post.status])}
    />
  );
}

function Platforms({ ids, className }: { ids: ReadonlyArray<string>; className?: string }) {
  if (ids.length === 0) return null;
  return (
    <span className={cn('flex items-center gap-1', className)}>
      {ids.flatMap((id) => {
        const s = serviceById(POST_PLATFORMS, id);
        return s ? [<ServiceIcon key={id} service={s} className="size-3.5" />] : [];
      })}
    </span>
  );
}

// Строка публикации: статус, что выкладываем, площадки, песня, когда и кто.
export function PostRow({
  post,
  songs,
  onOpen,
  showSong = true,
}: {
  post: Post;
  songs: ReadonlyArray<Song>;
  onOpen: () => void;
  showSong?: boolean;
}) {
  const people = usePeople(post.project);
  const song = post.song ? songs.find((s) => s.id === post.song) : undefined;
  const date = postDate(post, songs);
  const bucket = bucketOf(date, new Date());
  const assignees = (post.assignees ?? []).flatMap((id) => people.get(id) ?? []);
  const when = post.anchor === 'release' ? offsetLabel(post.offset ?? 0) : '';
  const meta = [showSong ? song?.title : '', when, POST_STATUS_LABEL[post.status]].filter(Boolean);
  const published = post.status === 'published';

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-groove/30"
    >
      <span className="flex size-6 shrink-0 items-center justify-center">
        <StatusDot post={post} />
      </span>
      <span className="flex min-h-9 min-w-0 flex-1 flex-col justify-center">
        <span className={cn('text-pretty', published && 'text-dim')}>
          <MentionText text={post.title} />
        </span>
        <span className="flex min-w-0 items-center gap-1.5 text-xs text-dim">
          <Platforms ids={post.platforms ?? []} />
          <span className="truncate">{meta.join(' · ')}</span>
        </span>
      </span>
      {!published && <Due due={date} bucket={bucket} />}
      {published && date && (
        <span className="shrink-0 text-xs text-dim tabular-nums">{dateLabel(date)}</span>
      )}
      <AvatarStack users={assignees} />
    </button>
  );
}

// Новая публикация: только название; остальное - в окне, которое открывается сразу.
export function PostComposer({
  projectId,
  meId,
  song,
  onCreated,
}: {
  projectId: string;
  meId: string;
  // публикация песни: дата - от её релиза (если он есть)
  song?: Song | undefined;
  onCreated: (post: Post) => void;
}) {
  const client = useQueryClient();
  const [title, setTitle] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const people = useMentionPeople(projectId);
  const mentions = useMentions({ ref: input, value: title, setValue: setTitle, people });
  const add = useMutation({
    mutationFn: () =>
      createPost(pb, {
        project: projectId,
        title,
        author: meId,
        assignees: mentionedIds(title, people),
        ...(song ? { song: song.id, anchor: 'release', offset: 0 } : {}),
      }),
    onSuccess: async (post) => {
      setTitle('');
      await client.invalidateQueries({ queryKey: ['posts', projectId] });
      onCreated(post);
    },
    onError: () => toast.error('Публикация не добавлена: проверьте соединение'),
  });
  function submit(e: FormEvent) {
    e.preventDefault();
    if (title.trim() && !add.isPending) add.mutate();
  }
  return (
    <form onSubmit={submit} className={cn(GROUP, 'focus-within:ring-2 focus-within:ring-ring/30')}>
      <div className="flex items-center gap-2 px-4">
        <Plus className="size-4 shrink-0 text-dim" />
        <label htmlFor={`new-post-${song?.id ?? projectId}`} className="sr-only">
          Новая публикация
        </label>
        <Input
          ref={input}
          id={`new-post-${song?.id ?? projectId}`}
          placeholder="Новая публикация"
          maxLength={300}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onSelect={mentions.sync}
          onKeyDown={(e) => {
            mentions.onKeyDown(e);
          }}
          className="h-12 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 md:h-11 dark:bg-transparent"
        />
        {mentions.menu}
        {title.trim() && (
          <Button type="submit" size="sm" className="h-8 animate-enter" disabled={add.isPending}>
            Добавить
          </Button>
        )}
      </div>
    </form>
  );
}

// Промо-план песни: набор публикаций из настроек проекта, вокруг релиза, одной кнопкой. Пустой
// набор - кнопки нет.
export function PromoButton({ song, meId }: { song: Song; meId: string }) {
  const client = useQueryClient();
  const promo = useQuery(promoQuery(song.project));
  const steps = promo.data ?? [];
  const make = useMutation({
    mutationFn: async () => {
      const batch = pb.createBatch();
      for (const p of steps) {
        batch.collection('posts').create({
          project: song.project,
          song: song.id,
          title: p.title,
          text: p.comment ?? '',
          author: meId,
          status: 'idea',
          anchor: 'release',
          offset: p.offset,
          platforms: p.platforms ?? [],
          assignees: [],
        });
      }
      await batch.send();
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['posts', song.project] }),
    onError: () => toast.error('Промо-план не создан: проверьте соединение'),
  });
  if (steps.length === 0) return null;
  return (
    <Button
      variant="secondary"
      size="sm"
      className="h-9 px-3"
      disabled={make.isPending}
      onClick={() => make.mutate()}
    >
      <Sparkles data-icon="inline-start" />
      Добавить промо-план
    </Button>
  );
}

const NO_SONG = 'none';

// Публикация целиком: что, где, когда (дата или от релиза), кто, текст поста.
export function PostDialog({
  post,
  canWork,
  open,
  onOpenChange,
}: {
  post: Post;
  canWork: boolean;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const client = useQueryClient();
  const songs = useQuery(songsQuery(post.project));
  const list = songs.data ?? [];
  const song = post.song ? list.find((s) => s.id === post.song) : undefined;
  const people = useMentionPeople(post.project);
  const [title, setTitle] = useState(post.title);
  const [text, setText] = useState(post.text ?? '');
  const [editingTitle, setEditingTitle] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const titleMentions = useMentions({ ref: titleRef, value: title, setValue: setTitle, people });
  const textMentions = useMentions({ ref: textRef, value: text, setValue: setText, people });
  useEffect(() => setTitle(post.title), [post.title]);
  useEffect(() => setText(post.text ?? ''), [post.text]);

  const save = (patch: PostPatch) =>
    void updatePost(client, post, patch).catch(() =>
      toast.error('Не сохранилось: проверьте соединение'),
    );
  const remove = useMutation({
    mutationFn: () => collection(pb, 'posts').delete(post.id),
    onSuccess: async () => {
      setConfirming(false);
      onOpenChange(false);
      await client.invalidateQueries({ queryKey: ['posts'] });
    },
    onError: () => toast.error('Публикация не удалена: проверьте соединение'),
  });
  // новые упомянутые - исполнители
  const withMentions = (t: string): PostPatch => {
    const current = post.assignees ?? [];
    const added = mentionedIds(t, people).filter((id) => !current.includes(id));
    return added.length > 0 ? { assignees: [...current, ...added] } : {};
  };
  const commitTitle = () => {
    setEditingTitle(false);
    const t = title.trim();
    if (!t || t === post.title) {
      setTitle(post.title);
      return;
    }
    save({ title: t, ...withMentions(t) });
  };
  const commitText = () => {
    if (text !== (post.text ?? '')) save({ text, ...withMentions(text) });
  };
  const platforms = post.platforms ?? [];
  const togglePlatform = (id: string) =>
    save({
      platforms: platforms.includes(id) ? platforms.filter((x) => x !== id) : [...platforms, id],
    });
  const fromRelease = post.anchor === 'release' && Boolean(song);
  const date = postDate(post, list);
  const offset = post.offset ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-4">
        <DialogHeader>
          <DialogTitle className="sr-only">Публикация</DialogTitle>
          <div className="flex items-start gap-2 pr-8">
            <span className="flex size-8 shrink-0 items-center justify-center">
              <StatusDot post={post} />
            </span>
            {!editingTitle && (
              <button
                type="button"
                disabled={!canWork}
                onClick={() => {
                  setEditingTitle(true);
                  requestAnimationFrame(() => titleRef.current?.focus());
                }}
                className="min-w-0 flex-1 cursor-text rounded-lg px-1.5 text-left text-lg leading-8 font-medium text-pretty transition-colors hover:bg-groove/40 disabled:cursor-default disabled:hover:bg-transparent"
              >
                <MentionText text={post.title} />
              </button>
            )}
            <label htmlFor="post-title" className="sr-only">
              Что публикуем
            </label>
            <textarea
              ref={titleRef}
              id="post-title"
              rows={1}
              maxLength={300}
              hidden={!editingTitle}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onSelect={titleMentions.sync}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (titleMentions.onKeyDown(e)) return;
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.currentTarget.blur();
                }
              }}
              className="field-sizing-content min-w-0 flex-1 resize-none rounded-lg bg-groove/50 px-1.5 py-0 text-lg leading-8 font-medium outline-none"
            />
            {titleMentions.menu}
          </div>
        </DialogHeader>

        <Segmented
          label="Статус"
          options={POST_STATUSES.map((s) => ({ value: s, label: POST_STATUS_LABEL[s] }))}
          value={post.status}
          onChange={(status) => canWork && save({ status })}
          // на телефоне четыре статуса не влезают в строку: два ряда
          className="grid grid-cols-2 ring-1 ring-border/70 sm:flex dark:ring-border/40"
        />

        <fieldset className="flex flex-wrap gap-1.5" disabled={!canWork}>
          <legend className="sr-only">Площадки</legend>
          {POST_PLATFORMS.map((s) => {
            const on = platforms.includes(s.id);
            return (
              <button
                key={s.id}
                type="button"
                aria-pressed={on}
                onClick={() => togglePlatform(s.id)}
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
        </fieldset>

        <div className={GROUP_ROWS}>
          <PropRow label="Песня">
            <MenuSelect
              label="Песня"
              value={post.song || NO_SONG}
              dim={!song}
              disabled={!canWork}
              onChange={(v) =>
                save(v === NO_SONG ? { song: '', anchor: 'date', date: date || '' } : { song: v })
              }
              options={[
                ...list.map((s) => ({ value: s.id, label: s.title })),
                { value: NO_SONG, label: 'Без песни', separated: list.length > 0 },
              ]}
            />
          </PropRow>
          {song && (
            <div className="px-4 py-3">
              <Segmented
                label="Когда"
                options={[
                  { value: 'release', label: 'От релиза' },
                  { value: 'date', label: 'Своя дата' },
                ]}
                value={fromRelease ? 'release' : 'date'}
                onChange={(a) =>
                  canWork &&
                  save(a === 'release' ? { anchor: 'release' } : { anchor: 'date', date })
                }
                className="bg-console/60 dark:bg-black/15"
              />
            </div>
          )}
          {fromRelease ? (
            <PropRow label="Когда">
              <span className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="На день раньше"
                  disabled={!canWork || offset <= -365}
                  onClick={() => save({ offset: offset - 1 })}
                >
                  <Minus />
                </Button>
                <span className="min-w-36 text-center text-sm whitespace-nowrap">
                  {offsetLabel(offset)}
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="На день позже"
                  className="-mr-2"
                  disabled={!canWork || offset >= 365}
                  onClick={() => save({ offset: offset + 1 })}
                >
                  <Plus />
                </Button>
              </span>
            </PropRow>
          ) : (
            <PropRow label="Дата">
              <DateField
                quiet
                disabled={!canWork}
                value={post.date ?? ''}
                placeholder="Без даты"
                onChange={(date) => save({ date })}
              />
            </PropRow>
          )}
          {fromRelease && (
            <PropRow label="Выходит">
              <span className={cn('px-2 text-sm', !date && 'text-dim')}>
                {date ? dateLabel(date) : 'нет даты релиза'}
              </span>
            </PropRow>
          )}
          <PropRow label="Кто делает">
            <PeoplePicker
              projectId={post.project}
              value={post.assignees ?? []}
              disabled={!canWork}
              onChange={(assignees) => save({ assignees })}
            />
          </PropRow>
        </div>

        <div className="relative">
          <label htmlFor="post-text" className="sr-only">
            Текст поста
          </label>
          <Textarea
            ref={textRef}
            id="post-text"
            rows={3}
            maxLength={10000}
            disabled={!canWork}
            placeholder="Текст поста, идеи, хэштеги"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onSelect={textMentions.sync}
            onBlur={commitText}
            onKeyDown={(e) => {
              textMentions.onKeyDown(e);
            }}
            className="min-h-24"
          />
          {textMentions.menu}
        </div>

        <DialogFooter className="flex-row items-center justify-between sm:justify-between">
          {canWork ? (
            <Button
              variant="ghost"
              className="-ml-2 text-led-red hover:bg-led-red/10 hover:text-led-red"
              onClick={() => setConfirming(true)}
            >
              <Trash2 data-icon="inline-start" />
              Удалить
            </Button>
          ) : (
            <span />
          )}
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Готово
          </Button>
        </DialogFooter>
        <ConfirmDialog
          open={confirming}
          onOpenChange={setConfirming}
          title={`Удалить "${post.title}"?`}
          confirm="Удалить"
          busy={remove.isPending}
          onConfirm={() => remove.mutate()}
        />
      </DialogContent>
    </Dialog>
  );
}

// Контент-план проекта: публикации по срокам выхода; опубликованные - свёрнуты внизу.
export function ContentPlan({
  projectId,
  meId,
  mine,
  canWork,
}: {
  projectId: string;
  meId: string | undefined;
  mine: string | undefined;
  canWork: boolean;
}) {
  const songs = useQuery(songsQuery(projectId));
  const posts = useQuery(postsQuery(projectId));
  const [openId, setOpenId] = useState<string>();
  const [showDone, setShowDone] = useState(false);
  const list = songs.data ?? [];
  const all = (posts.data ?? []).filter((p) => !mine || (p.assignees ?? []).includes(mine));
  const today = new Date();
  const open = all.filter((p) => p.status !== 'published');
  const published = all
    .filter((p) => p.status === 'published')
    .sort((a, b) => postDate(b, list).localeCompare(postDate(a, list)));
  const groups = BUCKETS.map((bucket) => ({
    bucket,
    items: open
      .filter((p) => bucketOf(postDate(p, list), today) === bucket)
      .sort((a, b) => postDate(a, list).slice(0, 10).localeCompare(postDate(b, list).slice(0, 10))),
  })).filter((g) => g.items.length > 0);
  const opened = posts.data?.find((p) => p.id === openId);

  return (
    <div className="flex flex-col gap-8">
      {canWork && meId && (
        <PostComposer projectId={projectId} meId={meId} onCreated={(p) => setOpenId(p.id)} />
      )}
      {(posts.isPending || songs.isPending) && <Skeleton className="h-40 rounded-xl" />}
      {posts.isSuccess && groups.length === 0 && published.length === 0 && (
        <EmptyState>{mine ? 'На вас пока ничего' : 'Публикаций пока нет'}</EmptyState>
      )}
      {groups.map((g) => (
        <Section
          key={g.bucket}
          title={
            <span className={cn(g.bucket === 'overdue' && 'text-led-red')}>
              {g.bucket === 'none' ? 'Без даты' : BUCKET_LABEL[g.bucket]}
            </span>
          }
          action={<span className="text-sm text-dim tabular-nums">{g.items.length}</span>}
        >
          <ul className={GROUP_ROWS}>
            {g.items.map((p) => (
              <li key={p.id} className="animate-enter">
                <PostRow post={p} songs={list} onOpen={() => setOpenId(p.id)} />
              </li>
            ))}
          </ul>
        </Section>
      ))}
      {published.length > 0 && (
        <section>
          <button
            type="button"
            aria-expanded={showDone}
            onClick={() => setShowDone(!showDone)}
            className="mb-2 flex min-h-8 items-center gap-1.5 rounded-lg px-1 text-sm font-medium text-dim transition-colors hover:text-ink"
          >
            Опубликовано
            <span className="tabular-nums">{published.length}</span>
            <ChevronDown
              className={cn('size-4 transition-transform duration-200', showDone && 'rotate-180')}
            />
          </button>
          <Collapse open={showDone}>
            <ul className={GROUP_ROWS}>
              {published.map((p) => (
                <li key={p.id}>
                  <PostRow post={p} songs={list} onOpen={() => setOpenId(p.id)} />
                </li>
              ))}
            </ul>
          </Collapse>
        </section>
      )}
      {opened && (
        <PostDialog
          post={opened}
          canWork={canWork}
          open
          onOpenChange={(o) => !o && setOpenId(undefined)}
        />
      )}
    </div>
  );
}

// Публикации песни - в её карточке, рядом с релизом.
export function SongPosts({
  song,
  meId,
  canWork,
}: {
  song: Song;
  meId: string | undefined;
  canWork: boolean;
}) {
  const songs = useQuery(songsQuery(song.project));
  const posts = useQuery(postsQuery(song.project));
  const [openId, setOpenId] = useState<string>();
  const list = songs.data ?? [song];
  const mine = (posts.data ?? [])
    .filter((p) => p.song === song.id)
    .sort((a, b) => {
      const da = postDate(a, list) || '9999';
      const db = postDate(b, list) || '9999';
      return da.localeCompare(db) || (a.offset ?? 0) - (b.offset ?? 0);
    });
  const opened = posts.data?.find((p) => p.id === openId);
  if (!canWork && mine.length === 0) return null;
  return (
    <Section
      title="Публикации"
      action={
        mine.length > 0 && <span className="text-sm text-dim tabular-nums">{mine.length}</span>
      }
    >
      <div className="flex flex-col gap-3">
        {mine.length > 0 && (
          <ul className={GROUP_ROWS}>
            {mine.map((p) => (
              <li key={p.id} className="animate-enter">
                <PostRow post={p} songs={list} showSong={false} onOpen={() => setOpenId(p.id)} />
              </li>
            ))}
          </ul>
        )}
        {canWork && meId && (
          <PostComposer
            projectId={song.project}
            meId={meId}
            song={song}
            onCreated={(p) => setOpenId(p.id)}
          />
        )}
        {canWork && meId && mine.length === 0 && (
          <div>
            <PromoButton song={song} meId={meId} />
          </div>
        )}
      </div>
      {opened && (
        <PostDialog
          post={opened}
          canWork={canWork}
          open
          onOpenChange={(o) => !o && setOpenId(undefined)}
        />
      )}
    </Section>
  );
}
