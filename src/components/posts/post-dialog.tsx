import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Minus, Plus } from 'lucide-react';
import { useRef } from 'react';
import { toast } from 'sonner';
import { DateField } from '@/components/date-field';
import { EditableTitle } from '@/components/editable-title';
import { ItemDialogFooter } from '@/components/item-dialog-footer';
import { useMentions } from '@/components/mentions';
import { MenuSelect } from '@/components/menu-select';
import { GROUP_ROWS } from '@/components/page';
import { PeoplePicker } from '@/components/people-picker';
import { PlatformToggles } from '@/components/platform-toggles';
import { PostStatusDot } from '@/components/posts/post-row';
import { PropRow } from '@/components/prop-row';
import { Segmented } from '@/components/segmented';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useDraft } from '@/lib/draft';
import { errorText, SAVE_FAILED } from '@/lib/errors';
import { dateLabel } from '@/lib/format';
import { mentionedIds } from '@/lib/mentions';
import type { Post } from '@/lib/model';
import { collection, pb } from '@/lib/pb';
import { useProjectPeople } from '@/lib/people';
import { offsetLabel, type PostPatch, postDate, updatePost } from '@/lib/posts';
import { songsQuery } from '@/lib/queries';
import { queryKeys } from '@/lib/query-keys';
import { POST_STATUS_LABEL, POST_STATUSES } from '@/lib/statuses';
import { cn } from '@/lib/utils';

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
  const people = useProjectPeople(post.project, 'active');
  const workers = useProjectPeople(post.project, 'workers');
  const {
    draft: text,
    setDraft: setText,
    start: startText,
    finish: finishText,
  } = useDraft(post.text ?? '');
  const textRef = useRef<HTMLTextAreaElement>(null);
  const textMentions = useMentions({ ref: textRef, value: text, setValue: setText, people });

  const save = (patch: PostPatch) =>
    void updatePost(client, post, patch).catch((e) => toast.error(errorText(e, SAVE_FAILED)));
  const remove = useMutation({
    mutationFn: () => collection(pb, 'posts').delete(post.id),
    onSuccess: async () => {
      onOpenChange(false);
      await client.invalidateQueries({ queryKey: queryKeys.posts.all });
    },
    onError: (e) => toast.error(errorText(e, 'Публикация не удалена: проверьте соединение')),
  });
  // новые упомянутые - исполнители
  const withMentions = (t: string): PostPatch => {
    const current = post.assignees ?? [];
    const added = mentionedIds(t, workers).filter((id) => !current.includes(id));
    return added.length > 0 ? { assignees: [...current, ...added] } : {};
  };
  const commitTitle = (t: string) => save({ title: t, ...withMentions(t) });
  const commitText = () => {
    if (finishText() && text !== (post.text ?? '')) save({ text, ...withMentions(text) });
  };
  const platforms = post.platforms ?? [];
  const togglePlatform = (id: string, on: boolean) =>
    save({ platforms: on ? platforms.filter((x) => x !== id) : [...platforms, id] });
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
              <PostStatusDot post={post} />
            </span>
            <EditableTitle
              id="post-title"
              label="Что публикуем"
              value={post.title}
              projectId={post.project}
              disabled={!canWork}
              onCommit={commitTitle}
            />
          </div>
        </DialogHeader>

        <Segmented
          label="Статус"
          options={POST_STATUSES.map((s) => ({ value: s, label: POST_STATUS_LABEL[s] }))}
          value={post.status}
          onChange={(status) => canWork && save({ status })}
          disabled={!canWork}
          // на телефоне четыре статуса не влезают в строку: два ряда
          className="grid grid-cols-2 ring-1 ring-border/70 sm:flex dark:ring-border/40"
        />

        <fieldset className="flex flex-wrap gap-1.5" disabled={!canWork}>
          <legend className="sr-only">Площадки</legend>
          <PlatformToggles value={platforms} onToggle={togglePlatform} />
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
                disabled={!canWork}
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
            onFocus={startText}
            onBlur={commitText}
            onKeyDown={(e) => {
              textMentions.onKeyDown(e);
            }}
            className="min-h-24"
          />
          {textMentions.menu}
        </div>

        <ItemDialogFooter
          canWork={canWork}
          title={post.title}
          deleting={remove.isPending}
          onDelete={() => remove.mutate()}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
