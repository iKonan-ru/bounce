import { describe, expect, it } from 'vitest';
import {
  checkIsFileAccepted,
  checkCanDropFiles,
} from '../src/shared/utils/file-drop';

describe('перенос файлов', () => {
  it('различает картинки, аудио и точный формат обложки релиза', () => {
    const image = { name: 'обложка.png', type: 'image/png' };
    const audio = { name: 'трек.mp3', type: 'audio/mpeg' };
    expect(checkIsFileAccepted(image, 'image/*')).toBe(true);
    expect(checkIsFileAccepted(audio, 'image/*')).toBe(false);
    expect(checkIsFileAccepted(image, 'image/jpeg')).toBe(false);
    expect(checkIsFileAccepted(audio, 'image/*,audio/*')).toBe(true);
  });

  it('распознаёт расширение без MIME и без учёта регистра', () => {
    expect(
      checkIsFileAccepted(
        { name: 'TRACK.WAV', type: '' },
        '.wav,.mp3,audio/mpeg'
      )
    ).toBe(true);
    expect(
      checkIsFileAccepted(
        { name: 'backup.ZIP', type: '' },
        '.zip,application/zip'
      )
    ).toBe(true);
    expect(
      checkIsFileAccepted({ name: 'track.wav.exe', type: '' }, '.wav')
    ).toBe(false);
  });

  it('не подсвечивает зоны при переносе текста и сортировке блоков', () => {
    const transfer = {
      types: ['text/plain'],
      items: [],
    } as unknown as DataTransfer;
    expect(checkCanDropFiles(transfer, 'image/*')).toBe(false);
  });

  it('до отпускания проверяет типы и допускает скрытый браузером тип', () => {
    const transfer = {
      types: ['Files'],
      items: [{ kind: 'file', type: 'audio/mpeg' }],
    } as unknown as DataTransfer;
    expect(checkCanDropFiles(transfer, 'image/*')).toBe(false);
    expect(checkCanDropFiles(transfer, 'audio/*')).toBe(true);
    const unknown = {
      types: ['Files'],
      items: [{ kind: 'file', type: '' }],
    } as unknown as DataTransfer;
    expect(checkCanDropFiles(unknown, 'image/*')).toBe(true);
  });
});
