import type { Song } from '@/entities/song';
import { BUCKETS } from '@/shared/constants';
import {
  convertPbDateToDay,
  convertDayToPbDate,
  checkIsAssignedTo,
  getIsoDayKey,
  getBucket,
} from '@/shared/utils';
import {
  NO_DATE_SORT_KEY,
  DECIMAL_BASE,
  HUNDRED,
  TEEN_MIN,
  TEEN_MAX,
  FEW_MIN,
  FEW_MAX,
  DAYS_IN_WEEK,
  WEEKS_SPAN_MAX_DAYS,
} from '../constants/posts';
import type { Post } from '../types/post';
import { PostAnchor, PostStatus } from '../types/post';
import type { DatedPost, SongDates, PostGroups } from '../types/posts';

/**
 * Дата выхода публикации (полдень UTC, как все даты без времени): своя или от релиза песни
 *
 * Пусто - даты пока нет (у песни не указан релиз)
 */
export function getPostDate(post: DatedPost, songs: SongDates): string {
  if (post.anchor !== PostAnchor.release) {
    return post.date ?? '';
  }

  const song = songs.find((songDates) => songDates.id === post.song);
  const day = convertPbDateToDay(song?.target_release ?? '');

  if (!day) {
    return '';
  }

  day.setDate(day.getDate() + (post.offset ?? 0));

  return convertDayToPbDate(day);
}

/**
 * Контент-план проекта: открытые публикации по срокам выхода и опубликованные - сначала последние
 *
 * Открытые - в порядке BUCKETS, пустые группы пропускаются; внутри - по дню выхода, в один день -
 * как пришли. assigneeId - только те, где этот человек среди исполнителей
 */
export function groupPosts<
  Item extends DatedPost & Pick<Post, 'status' | 'assignees'>,
>(
  posts: readonly Item[],
  songs: SongDates,
  today: Date,
  assigneeId?: string
): PostGroups<Item> {
  const assignedPosts = posts.filter((post) =>
    checkIsAssignedTo(post, assigneeId)
  );
  const openPosts = assignedPosts.filter(
    (post) => post.status !== PostStatus.published
  );
  const published = assignedPosts
    .filter((post) => post.status === PostStatus.published)
    .sort((first, second) =>
      getPostDate(second, songs).localeCompare(getPostDate(first, songs))
    );
  const compareByDay = (first: Item, second: Item): number =>
    getIsoDayKey(getPostDate(first, songs)).localeCompare(
      getIsoDayKey(getPostDate(second, songs))
    );
  const groups = BUCKETS.map((bucket) => ({
    bucket,
    items: openPosts
      .filter((post) => getBucket(getPostDate(post, songs), today) === bucket)
      .sort(compareByDay),
  })).filter((group) => group.items.length > 0);

  return { groups, published };
}

/** Публикации песни по дате выхода; без даты - в конце; в один день - по сдвигу от релиза */
export function getSongPosts<Item extends DatedPost>(
  posts: readonly Item[],
  songId: string,
  songs: SongDates
): Item[] {
  const compareByDate = (first: Item, second: Item): number => {
    const firstDate = getPostDate(first, songs) || NO_DATE_SORT_KEY;
    const secondDate = getPostDate(second, songs) || NO_DATE_SORT_KEY;
    const byDate = firstDate.localeCompare(secondDate);

    if (byDate !== 0) {
      return byDate;
    }

    return (first.offset ?? 0) - (second.offset ?? 0);
  };

  return posts.filter((post) => post.song === songId).sort(compareByDate);
}

/** Склонение по числу: 1 день, 2 дня, 5 дней */
function getPlural(
  count: number,
  one: string,
  few: string,
  many: string
): string {
  const lastDigit = count % DECIMAL_BASE;
  const lastTwoDigits = count % HUNDRED;
  const isTeen = lastTwoDigits >= TEEN_MIN && lastTwoDigits <= TEEN_MAX;

  if (isTeen) {
    return many;
  }

  if (lastDigit === 1) {
    return one;
  }

  const isFew = lastDigit >= FEW_MIN && lastDigit <= FEW_MAX;

  return isFew ? few : many;
}

/** Срок словами: "неделю", "2 недели", "день", "3 дня"; целые недели до четырёх - неделями */
function getSpanLabel(days: number): string {
  const isWholeWeeks = days % DAYS_IN_WEEK === 0 && days <= WEEKS_SPAN_MAX_DAYS;

  if (isWholeWeeks) {
    const weeks = days / DAYS_IN_WEEK;

    if (weeks === 1) {
      return 'неделю';
    }

    return `${weeks} ${getPlural(weeks, 'неделю', 'недели', 'недель')}`;
  }

  if (days === 1) {
    return 'день';
  }

  return `${days} ${getPlural(days, 'день', 'дня', 'дней')}`;
}

/** Сдвиг от релиза словами: "в день релиза", "за 3 дня до релиза", "через неделю после релиза" */
export function getOffsetLabel(offset: number): string {
  if (offset === 0) {
    return 'в день релиза';
  }

  const span = getSpanLabel(Math.abs(offset));

  if (offset < 0) {
    return `за ${span} до релиза`;
  }

  return `через ${span} после релиза`;
}

/** Песня публикации среди песен проекта */
export function findPostSong(
  post: Post,
  songs: readonly Song[]
): Song | undefined {
  if (!post.song) {
    return undefined;
  }

  return songs.find((song) => song.id === post.song);
}
