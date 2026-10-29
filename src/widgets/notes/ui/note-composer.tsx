import { ImagePlus, Mic } from 'lucide-react';
import type { ReactNode } from 'react';
import { MarkupToolbar } from '@/features/markup';
import { IMAGE_ACCEPT, AUDIO_ACCEPT } from '@/shared/constants';
import { Textarea, Progress, Button } from '@/shared/ui';
import { NOTE_TEXT_MAX_LENGTH } from '../constants/note-composer';
import { useNoteComposer } from '../hooks/use-note-composer';
import type { NoteComposerProps } from '../types/note-composer';
import { ChosenFiles } from './chosen-files';

/**
 * Новая заметка: текст с оформлением и упоминаниями, картинки и аудио
 *
 * Без сети - в очередь на устройстве (lib/outbox.ts); недописанный текст - черновик в localStorage
 */
export function NoteComposer({ scope }: NoteComposerProps): ReactNode {
  const {
    textRef,
    imageInputRef,
    audioInputRef,
    textareaId,
    text,
    images,
    audio,
    setImages,
    setAudio,
    isBusy,
    hasContent,
    isUploading,
    progressPercent,
    showToolbar,
    submitLabel,
    formClassName,
    mentionsMenu,
    onMarkupAction,
    onTextSelect,
    handleSubmit,
    onFormFocus,
    onFormBlur,
    onTextChange,
    onTextPaste,
    onTextKeyDown,
    onImagesInputChange,
    onAudioInputChange,
    onImageClick,
    onAudioClick,
  } = useNoteComposer(scope);

  return (
    <form
      onSubmit={handleSubmit}
      onFocus={onFormFocus}
      onBlur={onFormBlur}
      className={formClassName}
    >
      <label htmlFor={textareaId} className="sr-only">
        Новая заметка
      </label>
      <Textarea
        ref={textRef}
        id={textareaId}
        rows={1}
        maxLength={NOTE_TEXT_MAX_LENGTH}
        placeholder="Написать заметку"
        value={text}
        disabled={isBusy}
        onChange={onTextChange}
        onPaste={onTextPaste}
        onSelect={onTextSelect}
        onKeyDown={onTextKeyDown}
        className="max-h-80 min-h-12 resize-none rounded-none border-0 bg-transparent px-4 py-3 shadow-none focus-visible:ring-0 dark:bg-transparent"
      />
      {mentionsMenu}
      <ChosenFiles
        images={images}
        audio={audio}
        disabled={isBusy}
        onImagesChange={setImages}
        onAudioChange={setAudio}
      />
      {isUploading && (
        <Progress
          className="mx-4 mb-2 w-auto"
          value={progressPercent}
          aria-label="Загрузка файлов"
        />
      )}
      {showToolbar && (
        <MarkupToolbar
          onAction={onMarkupAction}
          disabled={isBusy}
          className="px-2"
        />
      )}
      <div className="flex items-center gap-0.5 px-1.5 pb-2">
        <input
          ref={imageInputRef}
          type="file"
          accept={IMAGE_ACCEPT}
          multiple
          hidden
          onChange={onImagesInputChange}
        />
        <input
          ref={audioInputRef}
          type="file"
          accept={AUDIO_ACCEPT}
          multiple
          hidden
          onChange={onAudioInputChange}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isBusy}
          onClick={onImageClick}
          className="h-9 text-dim"
        >
          <ImagePlus data-icon="inline-start" />
          Картинка
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isBusy}
          onClick={onAudioClick}
          className="h-9 text-dim"
        >
          <Mic data-icon="inline-start" />
          Аудио
        </Button>
        {hasContent && (
          <Button
            type="submit"
            size="sm"
            className="ml-auto h-9 px-3"
            disabled={isBusy}
          >
            {submitLabel}
          </Button>
        )}
      </div>
    </form>
  );
}
