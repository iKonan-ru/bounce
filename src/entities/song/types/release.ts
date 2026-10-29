/** Поля песни, которые нужны для отправки на лейбл */
export interface ReleaseFields {
  lyrics?: string | undefined;
  release_cover?: string | undefined;
  target_release?: string | undefined;
}

/** Условие отправки на лейбл */
export interface ReleaseRequirement {
  /** Чего не хватает - для подсказки */
  label: string;
  checkIsMet: (song: ReleaseFields) => boolean;
}
