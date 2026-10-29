import type { FileRecord } from '@/shared/types';

/** Пользователь с аватаром */
export interface AvatarRecord extends FileRecord {
  avatar?: string;
}
