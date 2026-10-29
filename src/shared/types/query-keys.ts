/** Корень ключа запроса: первая часть */
export enum QueryRoot {
  /** Проекты */
  Projects = 'projects',
  /** Песни вместе с этапами */
  Songs = 'songs',
  /** Шаблоны этапов */
  StageTemplates = 'stage_templates',
  /** Шаблоны промо-плана */
  PromoTemplates = 'promo_templates',
  /** Пользователи */
  Users = 'users',
  /** Заметки */
  Notes = 'notes',
  /** Задачи */
  Tasks = 'tasks',
  /** Публикации контент-плана */
  Posts = 'posts',
  /** Токен для ссылок на закрытые файлы */
  FileToken = 'file-token',
  /** Ключ для подключения 2FA */
  TotpSetup = 'totp-setup',
}
