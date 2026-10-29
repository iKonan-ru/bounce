import type { MentionPart } from '@/shared/types';

/** Пропсы имени вместо логина */
export interface MentionNameProps {
  username: string;
}

/** Пропсы текста с упоминаниями */
export interface MentionTextProps {
  text: string;
}

/** Пропсы части текста с упоминаниями */
export interface MentionPartViewProps {
  part: MentionPart;
}
