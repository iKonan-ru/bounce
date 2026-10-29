import { WIDE_SCREEN_QUERY } from '../constants/media';
import { useMediaQuery } from './use-media-query';

/** Широкий экран (от 1024px): страницы раскладываются в две колонки */
export function useIsWideScreen(): boolean {
  return useMediaQuery(WIDE_SCREEN_QUERY);
}
