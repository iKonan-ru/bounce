import type { ReactNode } from 'react';
import { useParams } from '@tanstack/react-router';
import { LYRICS_ROUTE_ID } from '../constants/lyrics';
import { Lyrics } from './lyrics';

/** Страница пересоздаётся при смене песни: иначе черновик одной песни попал бы в другую */
export function LyricsPage(): ReactNode {
  const { songId } = useParams({ from: LYRICS_ROUTE_ID });

  return <Lyrics key={songId} />;
}
