import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UPDATE_DELAY_MS } from '../src/app/constants/update';
import { UpdateProgress } from '../src/app/ui/update-progress';
import { startUpdates } from '../src/app/utils/update';

const mocks = vi.hoisted(() => ({
  toast: vi.fn(),
  register: vi.fn(),
  update: vi.fn(),
  reload: vi.fn(),
}));

vi.mock('sonner', () => ({ toast: mocks.toast }));
vi.mock('virtual:pwa-register', () => ({ registerSW: mocks.register }));

/** События зарегистрированного service worker */
function getCallbacks(): {
  onNeedRefresh: () => void;
  onNeedReload: () => void;
} {
  return mocks.register.mock.calls[0]?.[0];
}

/** Кнопка последней плашки обновления */
function getUpdateButton(): () => void {
  return mocks.toast.mock.lastCall?.[1].action.onClick;
}

describe('автоматическое обновление', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.stubGlobal('window', { location: { reload: mocks.reload } });
    mocks.register.mockReturnValue(mocks.update);
    startUpdates();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('показывает полосу на 5 секунд и обновляет после её окончания', () => {
    getCallbacks().onNeedRefresh();
    expect(mocks.toast.mock.lastCall?.[1]).toMatchObject({
      className: 'app-update-toast',
      action: { label: 'Обновить' },
    });
    expect(renderToStaticMarkup(createElement(UpdateProgress))).toContain(
      'animation-duration:5000ms'
    );
    vi.advanceTimersByTime(UPDATE_DELAY_MS - 1);
    expect(mocks.update).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(mocks.update).toHaveBeenCalledExactlyOnceWith(true);
    getCallbacks().onNeedReload();
    expect(mocks.reload).toHaveBeenCalledOnce();
  });

  it('кнопка обновляет сразу, без повторного вызова таймером', () => {
    getCallbacks().onNeedRefresh();
    vi.advanceTimersByTime(1_000);
    getUpdateButton()();
    expect(mocks.update).toHaveBeenCalledExactlyOnceWith(true);
    vi.advanceTimersByTime(UPDATE_DELAY_MS);
    getUpdateButton()();
    expect(mocks.update).toHaveBeenCalledOnce();
  });

  it('обновление в соседнем окне заменяет старый таймер перезагрузкой', () => {
    getCallbacks().onNeedRefresh();
    vi.advanceTimersByTime(1_000);
    getCallbacks().onNeedReload();
    vi.advanceTimersByTime(UPDATE_DELAY_MS - 1);
    expect(mocks.reload).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(mocks.reload).toHaveBeenCalledOnce();
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
