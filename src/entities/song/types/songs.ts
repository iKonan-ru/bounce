/** Поля песни с обложками */
export interface SongCovers {
  covers?: readonly string[] | undefined;
  main_cover?: string | undefined;
  release_cover?: string | undefined;
}
