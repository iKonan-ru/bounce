import type { CoverTileProps, UseCoverTileResult } from '../types/song-edit';

/** Действия плитки обложки: все - с именем файла обложки */
export function useCoverTile({
  songTitle,
  cover,
  isMain,
  isBusy,
  onView,
  onMakeMain,
  onRemove,
}: CoverTileProps): UseCoverTileResult {
  const openLabel = `Открыть обложку: ${songTitle}`;
  const mainLabel = isMain ? 'Основная обложка' : 'Сделать основной';
  const isMainDisabled = isBusy || isMain;

  const onViewClick = (): void => {
    onView(cover);
  };

  const onMainClick = (): void => {
    onMakeMain(cover);
  };

  const onRemoveClick = (): void => {
    onRemove(cover);
  };

  return {
    openLabel,
    mainLabel,
    isMainDisabled,
    onViewClick,
    onMainClick,
    onRemoveClick,
  };
}
