import { Pencil } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  Button,
  PageHeader,
  Loading,
  EmptyState,
  ConfirmDialog,
} from '@/shared/ui';
import { cn } from '@/shared/utils';
import { LYRICS_SIZE_CLASSES } from '../constants/lyrics';
import { useLyrics } from '../hooks/use-lyrics';
import type {
  StoredDraftBannerProps,
  LyricsReaderProps,
  LyricsPartBlockProps,
} from '../types/lyrics';
import { LyricsForm } from './lyrics-form';
import { ReadingActions } from './reading-actions';

/** Текст песни: чтение, правка с метками частей и черновик на устройстве */
export function Lyrics(): ReactNode {
  const {
    song,
    crumbs,
    canEdit,
    parts,
    isEditing,
    draft,
    isReading,
    isOutdated,
    isSaving,
    sizeIndex,
    isSmallest,
    isLargest,
    shouldShowDraftBanner,
    isStoredDraftStale,
    shouldShowEmpty,
    isCancelConfirmOpen,
    setIsCancelConfirmOpen,
    textareaRef,
    onSmallerClick,
    onLargerClick,
    onCopyClick,
    onEditClick,
    onDiscardClick,
    onCancelClick,
    onCancelConfirm,
    onFormSubmit,
    onDraftChange,
    handleTagAdd,
  } = useLyrics();

  const headerActions = isReading && (
    <ReadingActions
      canEdit={canEdit}
      isSmallest={isSmallest}
      isLargest={isLargest}
      onSmallerClick={onSmallerClick}
      onLargerClick={onLargerClick}
      onCopyClick={onCopyClick}
      onEditClick={onEditClick}
    />
  );
  const emptyAction = canEdit && (
    <Button variant="secondary" onClick={onEditClick}>
      <Pencil data-icon="inline-start" />
      Написать текст
    </Button>
  );

  return (
    <>
      <PageHeader crumbs={crumbs} title="Текст песни" actions={headerActions} />
      {song.isPending && <Loading className="h-60 rounded-xl" />}

      {shouldShowDraftBanner && (
        <StoredDraftBanner
          isStale={isStoredDraftStale}
          onDiscardClick={onDiscardClick}
          onContinueClick={onEditClick}
        />
      )}

      {shouldShowEmpty && (
        <EmptyState action={emptyAction}>Текста пока нет</EmptyState>
      )}

      {isReading && <LyricsReader parts={parts} sizeIndex={sizeIndex} />}

      {isEditing && (
        <LyricsForm
          draft={draft}
          isSaving={isSaving}
          isOutdated={isOutdated}
          textareaRef={textareaRef}
          onFormSubmit={onFormSubmit}
          onDraftChange={onDraftChange}
          onTagAdd={handleTagAdd}
          onCancelClick={onCancelClick}
        />
      )}
      <ConfirmDialog
        open={isCancelConfirmOpen}
        onOpenChange={setIsCancelConfirmOpen}
        title="Отменить правки?"
        description="Изменения в тексте пропадут."
        confirmLabel="Отменить правки"
        onConfirm={onCancelConfirm}
      />
    </>
  );
}

/** Плашка о несохранённой правке текста с прошлого раза */
function StoredDraftBanner({
  isStale,
  onDiscardClick,
  onContinueClick,
}: StoredDraftBannerProps): ReactNode {
  return (
    <div className="mb-4 flex max-w-3xl flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-panel px-4 py-3 text-sm ring-1 ring-border/70 dark:ring-border/40">
      <span className="flex-1">
        Есть несохранённая правка текста.
        {isStale && ' Текст с тех пор изменили.'}
      </span>
      <Button size="sm" variant="ghost" onClick={onDiscardClick}>
        Отбросить
      </Button>
      <Button size="sm" variant="secondary" onClick={onContinueClick}>
        <Pencil data-icon="inline-start" />
        Продолжить
      </Button>
    </div>
  );
}

/** Текст песни для чтения: части по порядку, шрифт выбранного размера */
function LyricsReader({ parts, sizeIndex }: LyricsReaderProps): ReactNode {
  const readerClassName = cn(
    'flex max-w-3xl flex-col gap-6 leading-relaxed',
    LYRICS_SIZE_CLASSES[sizeIndex]
  );

  return (
    <div className={readerClassName}>
      {parts.map((part, index) => {
        // номер в ключе допустим: части текста идут по порядку, их не переставляют
        const partKey = `${part.title}-${index}`;

        return <LyricsPartBlock key={partKey} part={part} />;
      })}
    </div>
  );
}

/** Часть текста: заголовок и строки */
function LyricsPartBlock({ part }: LyricsPartBlockProps): ReactNode {
  const lines = part.lines.join('\n');

  return (
    <div>
      {part.title && (
        <p className="mb-1 text-sm font-medium text-dim">{part.title}</p>
      )}
      <p className="whitespace-pre-wrap">{lines}</p>
    </div>
  );
}
