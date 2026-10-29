import { ROOMY_SCREEN_QUERY } from '../constants/media';
import { useMediaQuery } from './use-media-query';

/**
 * Просторный экран (от 1280px): боковая панель стоит рядом с содержимым и в развёрнутом виде
 *
 * Уже - только узкой полосой значков, а разворачивается поверх страницы
 */
export function useIsRoomyScreen(): boolean {
  return useMediaQuery(ROOMY_SCREEN_QUERY);
}
