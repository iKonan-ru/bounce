/** Текущий пользователь */
export interface Me {
  id: string;
  collectionId: string;
  collectionName: string;
  avatar: string;
  username: string;
  name: string;
  isAdmin: boolean;
  /** Главный разрешил создавать проекты (главному можно всегда) */
  canCreateProjects: boolean;
  /** Без подключённой 2FA правила PocketBase не отдают данных: сначала экран подключения */
  isTotpEnabled: boolean;
}
