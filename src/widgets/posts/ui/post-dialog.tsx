import { Minus, Plus } from 'lucide-react';
import type { ReactNode } from 'react';
import { PeoplePicker } from '@/entities/project';
import { PlatformToggles } from '@/entities/service';
import { EditableTitle } from '@/features/mentions';
import { GROUP_ROWS } from '@/shared/constants';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Segmented,
  PropRow,
  MenuSelect,
  Button,
  DateField,
  Textarea,
  ItemDialogFooter,
} from '@/shared/ui';
import {
  STATUS_OPTIONS,
  ANCHOR_OPTIONS,
  POST_TEXT_MAX_LENGTH,
} from '../constants/post-dialog';
import { usePostDialog } from '../hooks/use-post-dialog';
import type { PostDialogProps } from '../types/post-dialog';
import { PostStatusDot } from './post-status-dot';

/** Публикация целиком: что, где, когда (дата или от релиза), кто, текст поста */
export function PostDialog({
  post,
  canWork,
  open,
  onOpenChange,
}: PostDialogProps): ReactNode {
  const {
    song,
    songValue,
    songOptions,
    platforms,
    assignees,
    postDate,
    releaseDateText,
    releaseDateClassName,
    isFromRelease,
    anchorValue,
    offsetLabel,
    isEarlierDisabled,
    isLaterDisabled,
    isDeleting,
    textRef,
    text,
    mentionsMenu,
    onTitleCommit,
    onStatusChange,
    onPlatformToggle,
    onSongChange,
    onAnchorChange,
    onEarlierClick,
    onLaterClick,
    onDateChange,
    onAssigneesChange,
    onTextChange,
    onTextSelect,
    onTextFocus,
    onTextBlur,
    onTextKeyDown,
    onDeleteClick,
    onDoneClick,
  } = usePostDialog({ post, canWork, onOpenChange });

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
              onCommit={onTitleCommit}
            />
          </div>
        </DialogHeader>

        <Segmented
          label="Статус"
          options={STATUS_OPTIONS}
          value={post.status}
          onChange={onStatusChange}
          disabled={!canWork}
          // на телефоне четыре статуса не влезают в строку: два ряда
          className="grid grid-cols-2 ring-1 ring-border/70 sm:flex dark:ring-border/40"
        />

        <fieldset className="flex flex-wrap gap-1.5" disabled={!canWork}>
          <legend className="sr-only">Площадки</legend>
          <PlatformToggles value={platforms} onToggle={onPlatformToggle} />
        </fieldset>

        <div className={GROUP_ROWS}>
          <PropRow label="Песня">
            <MenuSelect
              label="Песня"
              value={songValue}
              isDim={!song}
              disabled={!canWork}
              onChange={onSongChange}
              options={songOptions}
            />
          </PropRow>
          {song && (
            <div className="px-4 py-3">
              <Segmented
                label="Когда"
                options={ANCHOR_OPTIONS}
                value={anchorValue}
                disabled={!canWork}
                onChange={onAnchorChange}
                className="bg-console/60 dark:bg-black/15"
              />
            </div>
          )}
          {isFromRelease ? (
            <PropRow label="Когда">
              <span className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="На день раньше"
                  disabled={isEarlierDisabled}
                  onClick={onEarlierClick}
                >
                  <Minus />
                </Button>
                <span className="min-w-36 text-center text-sm whitespace-nowrap">
                  {offsetLabel}
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="На день позже"
                  className="-mr-2"
                  disabled={isLaterDisabled}
                  onClick={onLaterClick}
                >
                  <Plus />
                </Button>
              </span>
            </PropRow>
          ) : (
            <PropRow label="Дата">
              <DateField
                isQuiet
                disabled={!canWork}
                value={postDate}
                placeholder="Без даты"
                onChange={onDateChange}
              />
            </PropRow>
          )}
          {isFromRelease && (
            <PropRow label="Выходит">
              <span className={releaseDateClassName}>{releaseDateText}</span>
            </PropRow>
          )}
          <PropRow label="Кто делает">
            <PeoplePicker
              projectId={post.project}
              value={assignees}
              disabled={!canWork}
              onChange={onAssigneesChange}
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
            maxLength={POST_TEXT_MAX_LENGTH}
            disabled={!canWork}
            placeholder="Текст поста, идеи, хэштеги"
            value={text}
            onChange={onTextChange}
            onSelect={onTextSelect}
            onFocus={onTextFocus}
            onBlur={onTextBlur}
            onKeyDown={onTextKeyDown}
            className="min-h-24"
          />
          {mentionsMenu}
        </div>

        <ItemDialogFooter
          canWork={canWork}
          title={post.title}
          isDeleting={isDeleting}
          onDelete={onDeleteClick}
          onDone={onDoneClick}
        />
      </DialogContent>
    </Dialog>
  );
}
