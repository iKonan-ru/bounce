import { describe, expect, it } from 'vitest';
import { ProjectDirection } from '@/entities/project';
import type { ProjectLink } from '@/entities/project';
import {
  saveScopedLink,
  deleteScopedLink,
  reorderScopedLinks,
} from '@/features/project-links';

const shared: ProjectLink = {
  id: 'sharedaccount01',
  name: 'Канал',
  service: 'youtube',
  url: 'https://example.com/shared',
  directions: [ProjectDirection.music, ProjectDirection.video],
};
const music: ProjectLink = {
  ...shared,
  id: 'musiconly000001',
  name: 'Музыка',
  directions: [ProjectDirection.music],
};
const video: ProjectLink = {
  ...shared,
  id: 'videoonly000001',
  name: 'Видео',
  directions: [ProjectDirection.video],
};

describe('Независимые ссылки направлений', () => {
  it('правка музыки сохраняет ID, адрес и имя видеоаккаунта', () => {
    const result = saveScopedLink(
      [shared, video],
      { ...shared, name: 'Новое имя', directions: [ProjectDirection.music] },
      shared,
      ProjectDirection.music
    );
    expect(result.find((link) => link.id === shared.id)).toEqual({
      ...shared,
      directions: [ProjectDirection.video],
    });
    expect(result.find((link) => link.name === 'Новое имя')?.id).not.toBe(
      shared.id
    );
    expect(result.find((link) => link.id === video.id)).toEqual(video);
  });
  it('правка видео сохраняет его ID и отделяет исходную музыкальную ссылку', () => {
    const result = saveScopedLink(
      [shared],
      {
        ...shared,
        url: 'https://example.com/video',
        directions: [ProjectDirection.video],
      },
      shared,
      ProjectDirection.video
    );
    expect(result.find((link) => link.id === shared.id)?.url).toBe(
      'https://example.com/video'
    );
    expect(
      result.find((link) => link.directions.includes(ProjectDirection.music))
        ?.url
    ).toBe(shared.url);
  });
  it('удаление общей музыкальной ссылки оставляет видео без смены ID', () => {
    expect(
      deleteScopedLink([shared, music], shared.id, ProjectDirection.music)
    ).toEqual([{ ...shared, directions: [ProjectDirection.video] }, music]);
  });
  it('порядок музыки не меняет порядок и ID аккаунтов видео', () => {
    const result = reorderScopedLinks(
      [shared, video, music],
      ProjectDirection.music,
      music.id,
      shared.id
    );
    expect(
      result
        .filter((link) => link.directions.includes(ProjectDirection.music))
        .map((link) => link.name)
    ).toEqual(['Музыка', 'Канал']);
    expect(
      result.filter((link) => link.directions.includes(ProjectDirection.video))
    ).toEqual([{ ...shared, directions: [ProjectDirection.video] }, video]);
    expect(shared.directions).toEqual([
      ProjectDirection.music,
      ProjectDirection.video,
    ]);
  });
  it('удаление отдельной ссылки не теряет другое направление', () => {
    expect(
      deleteScopedLink([music, video], music.id, ProjectDirection.music)
    ).toEqual([video]);
  });
});
