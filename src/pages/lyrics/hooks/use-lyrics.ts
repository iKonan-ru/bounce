import type { FormEvent, ChangeEvent } from 'react';
import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { toast } from 'sonner';
import { useAccess } from '@/entities/project';
import {
  songQuery,
  numberVerses,
  getLyricsParts,
  insertTag,
  getPlainLyrics,
} from '@/entities/song';
import {
  getCollection,
  pb,
  Collections,
  queryKeys,
  getErrorText,
} from '@/shared/api';
import { LYRICS_DRAFT_PREFIX } from '@/shared/constants';
import { useMe, useStoredChoice, useWakeLock } from '@/shared/hooks';
import { getField, checkHasStringField } from '@/shared/utils';
import { useSongCrumbs } from '@/widgets/page-crumbs';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import {
  MAX_SIZE_INDEX,
  DEFAULT_SIZE_INDEX,
  LYRICS_ROUTE_ID,
  LYRICS_SIZE_KEY,
} from '../constants/lyrics';
import type { LyricsDraft, UseLyricsResult } from '../types/lyrics';

/** Номер размера шрифта из хранилища; неизвестное значение - размер по умолчанию */
function parseSizeIndex(raw: string | null): number {
  const index = Number(raw);
  const isValid = [
    Number.isInteger(index),
    index >= 0,
    index <= MAX_SIZE_INDEX,
  ].every(Boolean);

  if (!isValid) {
    return DEFAULT_SIZE_INDEX;
  }

  return index;
}

/** Ключ хранилища для черновика текста песни */
function getDraftKey(songId: string): string {
  return LYRICS_DRAFT_PREFIX + songId;
}

/** Сохранённая правка текста этого пользователя; нет её - null */
function readLyricsDraft(songId: string, userId: string): LyricsDraft | null {
  try {
    const raw = localStorage.getItem(getDraftKey(songId));

    if (raw === null) {
      return null;
    }

    const stored: unknown = JSON.parse(raw);
    const isOwn = getField(stored, 'user') === userId;
    const hasTexts =
      checkHasStringField(stored, 'base') &&
      checkHasStringField(stored, 'draft');

    if (!isOwn) {
      return null;
    }

    if (!hasTexts) {
      return null;
    }

    return { user: userId, base: stored.base, draft: stored.draft };
  } catch (error) {
    // нет хранилища или запись не разобрать - черновика нет
    console.error(error);
  }

  return null;
}

/** Сохранить правку текста на устройстве; null - стереть */
function writeLyricsDraft(
  songId: string,
  lyricsDraft: LyricsDraft | null
): void {
  try {
    if (lyricsDraft === null) {
      localStorage.removeItem(getDraftKey(songId));

      return;
    }

    localStorage.setItem(getDraftKey(songId), JSON.stringify(lyricsDraft));
  } catch (error) {
    // без хранилища черновик живёт, пока открыта страница
    console.error(error);
  }
}

/** Состояние и обработчики страницы текста: чтение, правка и черновик на устройстве */
export function useLyrics(): UseLyricsResult {
  const { projectId, songId } = useParams({ from: LYRICS_ROUTE_ID });
  const meId = useMe()?.id ?? '';
  const queryClient = useQueryClient();
  const song = useQuery(songQuery(songId));
  const crumbs = useSongCrumbs(projectId, songId);
  const access = useAccess(projectId);
  const text = song.data?.lyrics ?? '';
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState('');
  // с какого текста начата правка: если он на сервере уже другой - предупреждение
  const [base, setBase] = useState('');
  const [sizeIndex, setSizeIndex] = useStoredChoice(
    LYRICS_SIZE_KEY,
    parseSizeIndex,
    DEFAULT_SIZE_INDEX
  );
  // черновик с прошлого раза, пока его не открыли и не отбросили
  const [storedDraft, setStoredDraft] = useState(() =>
    readLyricsDraft(songId, meId)
  );
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // куда поставить курсор после вставки метки: сразу после отрисовки нового текста
  const caretRef = useRef<number | null>(null);

  const isChanged = isEditing && draft !== text;
  const isOutdated = isEditing && base !== text;
  const isReading = !isEditing && text !== '';
  const isStoredDraftStale = storedDraft !== null && storedDraft.base !== text;
  const shouldShowDraftBanner = [
    access.canEdit,
    !isEditing,
    storedDraft !== null,
    storedDraft?.draft !== text,
  ].every(Boolean);
  const shouldShowEmpty = [song.isSuccess, !isEditing, !text].every(Boolean);
  const parts = numberVerses(getLyricsParts(text));

  useEffect(() => {
    if (!isEditing) {
      return;
    }

    if (draft === text) {
      writeLyricsDraft(songId, null);

      return;
    }

    writeLyricsDraft(songId, { user: meId, base, draft });
  }, [isEditing, draft, text, songId, meId, base]);

  // сохранённый черновик совпал с текстом (сохранение прошло, а ответ потерялся) - он не нужен
  useEffect(() => {
    if (!storedDraft) {
      return;
    }

    const isSaved = song.isSuccess && storedDraft.draft === text;

    if (isSaved) {
      writeLyricsDraft(songId, null);
      setStoredDraft(null);
    }
  }, [storedDraft, song.isSuccess, text, songId]);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    const caret = caretRef.current;

    if (!textarea || caret === null) {
      return;
    }

    if (textarea.value !== draft) {
      return;
    }

    textarea.focus();
    textarea.setSelectionRange(caret, caret);
    caretRef.current = null;
  }, [draft]);

  // экран не гаснет, пока текст открыт для чтения
  useWakeLock(isReading);

  const handleDraftDiscard = (): void => {
    writeLyricsDraft(songId, null);
    setStoredDraft(null);
  };

  const saveLyrics = useMutation({
    mutationFn: (lyrics: string) =>
      getCollection(pb, Collections.Songs).update(songId, { lyrics }),
    onSuccess: async () => {
      setIsEditing(false);
      handleDraftDiscard();
      await queryClient.invalidateQueries({ queryKey: queryKeys.songs.all });
    },
    onError: (error) =>
      toast.error(
        getErrorText(error, 'Текст не сохранён: проверьте соединение')
      ),
  });

  const onEditClick = (): void => {
    const saved = readLyricsDraft(songId, meId);
    setDraft(saved?.draft ?? text);
    setBase(saved?.base ?? text);
    setStoredDraft(null);
    setIsEditing(true);
  };

  const onCancelClick = (): void => {
    if (isChanged) {
      setIsCancelConfirmOpen(true);

      return;
    }

    handleDraftDiscard();
    setIsEditing(false);
  };

  const onCancelConfirm = (): void => {
    setIsCancelConfirmOpen(false);
    handleDraftDiscard();
    setIsEditing(false);
  };

  const onDiscardClick = (): void => {
    handleDraftDiscard();
  };

  const onSmallerClick = (): void => {
    setSizeIndex(sizeIndex - 1);
  };

  const onLargerClick = (): void => {
    setSizeIndex(sizeIndex + 1);
  };

  // метка части - на месте курсора; фокус остаётся в поле, чтобы сразу писать дальше
  const handleTagAdd = (tag: string): void => {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? draft.length;
    const end = textarea?.selectionEnd ?? draft.length;
    const next = insertTag({ value: draft, start, end }, tag);
    caretRef.current = next.start;
    setDraft(next.value);
  };

  const onCopyClick = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(getPlainLyrics(text));
      toast.success('Текст скопирован');
    } catch (error) {
      console.error(error);
      toast.error('Не удалось скопировать');
    }
  };

  const onFormSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();

    if (draft === text) {
      setIsEditing(false);

      return;
    }

    saveLyrics.mutate(draft);
  };

  const onDraftChange = (event: ChangeEvent<HTMLTextAreaElement>): void => {
    setDraft(event.target.value);
  };

  return {
    song,
    crumbs,
    canEdit: access.canEdit,
    text,
    parts,
    isEditing,
    draft,
    isReading,
    isOutdated,
    isSaving: saveLyrics.isPending,
    sizeIndex,
    isSmallest: sizeIndex === 0,
    isLargest: sizeIndex === MAX_SIZE_INDEX,
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
  };
}
