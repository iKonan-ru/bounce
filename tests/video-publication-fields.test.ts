import { describe, expect, it } from 'vitest';
import { getPublicationFields } from '@/entities/video-post';
import type { VideoPost } from '@/entities/video-post';

describe('Самостоятельные даты видеопубликаций', () => {
  it('сохраняет день автора из старого относительного офлайн-кэша', () => {
    const record = {
      anchor: 'main',
      scheduled_at: '2026-11-02 02:00:00.000Z',
      timezone: 'America/New_York',
      time: '21:00',
      offset: 3,
    } as VideoPost;
    expect(getPublicationFields(record)).toMatchObject({
      anchor: 'date',
      date: '2026-11-01',
      time: '21:00',
      timezone: 'America/New_York',
      offset: 0,
    });
  });
  it('не придумывает дату, если старая опора не была назначена', () => {
    const record = {
      anchor: 'main',
      scheduled_at: '',
      timezone: 'Europe/Moscow',
      date: '2026-11-10',
    } as VideoPost;
    expect(getPublicationFields(record).date).toBe('');
  });
  it('не изменяет собственную дату публикации', () => {
    const record = {
      anchor: 'date',
      date: '2026-11-03',
      timezone: 'Asia/Tokyo',
      time: '09:00',
    } as VideoPost;
    expect(getPublicationFields(record)).toMatchObject({
      anchor: 'date',
      date: '2026-11-03',
      time: '09:00',
    });
  });
});
