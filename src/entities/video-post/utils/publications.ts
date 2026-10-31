import type {
  VideoPost,
  PublicationFields,
  VideoPromo,
} from '../types/publication';

/** Новый срок берет зону устройства; сохраненный не зависит от устройства читателя */
export function getPublicationFields(
  record?: VideoPost | VideoPromo
): PublicationFields {
  return {
    title: record?.title ?? '',
    text: record && 'text' in record ? record.text : (record?.comment ?? ''),
    account: record?.account ?? '',
    anchor: 'date',
    date:
      record?.anchor === 'main'
        ? getIndependentDate(record)
        : (record?.date ?? ''),
    time: record?.time ?? '',
    timezone:
      record?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    offset: 0,
  };
}

/** Дата в поясе публикации, включая переход летнего времени */
export function formatPublicationDate(post: VideoPost): string {
  if (!post.scheduled_at) {
    return 'Без даты';
  }

  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: post.timezone,
    day: 'numeric',
    month: 'short',
    ...(post.time
      ? ({ hour: '2-digit', minute: '2-digit', timeZoneName: 'short' } as const)
      : {}),
  }).format(new Date(post.scheduled_at));
}

/** Короткое обозначение зоны рядом с временем */
export function getTimezoneLabel(timezone: string, date: string): string {
  return (
    new Intl.DateTimeFormat('ru-RU', {
      timeZone: timezone,
      timeZoneName: 'short',
    })
      .formatToParts(date ? new Date(date) : new Date())
      .find((part) => part.type === 'timeZoneName')?.value ?? timezone
  );
}

/** День плана с учетом зоны устройства для точного времени; без времени сохраняется день автора */
export function getPublicationDay(post: VideoPost): string {
  if (!post.scheduled_at) {
    return '';
  }

  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...(post.time ? {} : { timeZone: post.timezone }),
  }).formatToParts(new Date(post.scheduled_at));
  const get = (type: string): string =>
    parts.find((part) => part.type === type)?.value ?? '';

  return `${get('year')}-${get('month')}-${get('day')} 12:00:00.000Z`;
}

/** Старый офлайн-кэш относительной публикации открывается с уже рассчитанной датой */
function getIndependentDate(record: VideoPost | VideoPromo): string {
  if (!('scheduled_at' in record) || !record.scheduled_at) {
    return '';
  }

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: record.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(record.scheduled_at));
  const get = (type: string): string =>
    parts.find((part) => part.type === type)?.value ?? '';

  return `${get('year')}-${get('month')}-${get('day')}`;
}
