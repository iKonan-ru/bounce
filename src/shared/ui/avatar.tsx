import type { ReactNode } from 'react';
import { UNKNOWN_LETTER, AVATAR_THUMB } from '../constants/avatar';
import { useFileUrl } from '../hooks/use-file-url';
import type { AvatarUser, AvatarProps } from '../types/avatar';
import type { FileRecord } from '../types/records';
import { cn } from '../utils/cn';

/** Запись пользователя для ссылки на файл; без id или коллекции - undefined */
function getAvatarRecord(user: AvatarUser | undefined): FileRecord | undefined {
  if (!user) {
    return undefined;
  }

  const { id, collectionId, collectionName } = user;

  if (!id) {
    return undefined;
  }

  if (!collectionId) {
    return undefined;
  }

  if (!collectionName) {
    return undefined;
  }

  return { id, collectionId, collectionName };
}

/** Аватар пользователя: загруженная картинка или кружок с первой буквой имени */
export function Avatar({ user, className }: AvatarProps): ReactNode {
  const fileUrl = useFileUrl();
  const name = user?.name ?? '';
  const letter = name.trim().charAt(0).toUpperCase() || UNKNOWN_LETTER;
  const record = getAvatarRecord(user);
  let url: string | undefined;

  if (record) {
    // без картинки у пользователя fileUrl сам вернёт undefined
    url = fileUrl(record, user?.avatar, AVATAR_THUMB);
  }

  const avatarClassName = cn(
    'inline-flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-groove text-sm font-medium',
    className
  );

  return (
    <span aria-hidden="true" className={avatarClassName}>
      {url ? (
        <img src={url} alt="" className="size-full object-cover" />
      ) : (
        letter
      )}
    </span>
  );
}
