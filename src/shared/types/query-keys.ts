/** Корень ключа запроса: первая часть */
export enum QueryRoot {
  /** Проекты */
  Projects = 'projects',
  /** Песни вместе с этапами */
  Songs = 'songs',
  /** Видео вместе с этапами */
  Videos = 'videos',
  /** Карточки задач */
  ProjectTasks = 'project_tasks',
  /** Этапы задач; имя корня сохраняет совместимость */
  TaskStages = 'other_stages',
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
  /** Публикации видео */
  VideoPosts = 'video_posts',
  /** Токен для ссылок на закрытые файлы */
  FileToken = 'file-token',
  /** Ключ для подключения 2FA */
  TotpSetup = 'totp-setup',
}
