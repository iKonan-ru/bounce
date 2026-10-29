/** Человек для аватара: имя и, если есть, загруженная картинка */
export interface AvatarUser {
  name: string;
  id?: string;
  collectionId?: string;
  collectionName?: string;
  /** Имя файла картинки в записи пользователя */
  avatar?: string;
}

/** Пропсы аватара пользователя */
export interface AvatarProps {
  user: AvatarUser | undefined;
  className?: string;
}
