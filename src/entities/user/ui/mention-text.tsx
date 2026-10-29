import type { ReactNode } from 'react';
import { MentionPartKind } from '@/shared/types';
import { splitMentions } from '@/shared/utils';
import type { MentionPartViewProps, MentionTextProps } from '../types/mentions';
import { MentionName } from './mention-name';

/** Часть текста: упоминание показывается именем, остальное - как есть */
function MentionPartView({ part }: MentionPartViewProps): ReactNode {
  if (part.kind === MentionPartKind.Mention) {
    return <MentionName username={part.username} />;
  }

  return <span>{part.text}</span>;
}

/** Обычный текст с упоминаниями: логины показываются именами */
export function MentionText({ text }: MentionTextProps): ReactNode {
  const parts = splitMentions(text);

  return (
    <>
      {parts.map((part, index) => (
        // ключ - позиция: части идут по порядку текста
        <MentionPartView key={index} part={part} />
      ))}
    </>
  );
}
