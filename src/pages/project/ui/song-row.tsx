import type { ReactNode } from 'react';
import { cn } from '@/shared/utils';
import { Link } from '@tanstack/react-router';
import { TABLE_COLUMNS, BASIC_TABLE_COLUMNS } from '../constants/project';
import type { SongRowProps } from '../types/project';
import { SongRowContent } from './song-row-content';

/**
 * Строка песни
 *
 * В режиме порядка строка - не ссылка: её тянут за любое место, слева - значок захвата
 */
export function SongRow({
  song,
  projectId,
  isOrdering = false,
  isReleaseEnabled,
}: SongRowProps): ReactNode {
  const tableColumns = isReleaseEnabled ? TABLE_COLUMNS : BASIC_TABLE_COLUMNS;
  const rowClassName = cn(
    'flex min-w-0 items-center gap-3 px-4 py-3 transition-colors lg:py-2.5',
    tableColumns
  );
  const content = (
    <SongRowContent
      song={song}
      isOrdering={isOrdering}
      isReleaseEnabled={isReleaseEnabled}
    />
  );

  if (isOrdering) {
    const orderingClassName = cn(
      rowClassName,
      'cursor-grab hover:bg-groove/40 active:cursor-grabbing'
    );

    return <div className={orderingClassName}>{content}</div>;
  }

  const linkClassName = cn(
    rowClassName,
    'hover:bg-groove/40 active:bg-groove/70'
  );
  const linkParams = { projectId, songId: song.id };

  return (
    <Link
      to="/p/$projectId/songs/$songId"
      params={linkParams}
      draggable={false}
      className={linkClassName}
    >
      {content}
    </Link>
  );
}
