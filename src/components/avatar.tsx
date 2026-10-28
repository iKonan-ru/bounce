import { useFileUrl } from '@/components/images';
import { cn } from '@/lib/utils';

export type AvatarUser = {
  name: string;
  id?: string;
  collectionId?: string;
  collectionName?: string;
  avatar?: string;
};

// Аватар пользователя: загруженная картинка или кружок с первой буквой имени.
export function Avatar({ user, className }: { user: AvatarUser | undefined; className?: string }) {
  const fileUrl = useFileUrl();
  const name = user?.name ?? '';
  const letter = name.trim().charAt(0).toUpperCase() || '?';
  const url =
    user?.id && user.collectionId && user.collectionName && user.avatar
      ? fileUrl(
          { id: user.id, collectionId: user.collectionId, collectionName: user.collectionName },
          user.avatar,
          '96x96',
        )
      : undefined;
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-groove text-sm font-medium',
        className,
      )}
    >
      {url ? <img src={url} alt="" className="size-full object-cover" /> : letter}
    </span>
  );
}
