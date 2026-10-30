import type { ReactNode, FormEvent, ChangeEvent, KeyboardEvent } from 'react';
import type {
  ProjectLink,
  Project,
  ProjectDirection,
} from '@/entities/project';
import type { Service } from '@/entities/service';

/** Ссылка в списке с перетаскиванием: свой id у каждой */
export interface SortableLink {
  id: string;
  link: ProjectLink;
}

/** Что правится в окне ссылки */
export enum EditTarget {
  /** Новая ссылка, ещё не сохранённая */
  New = 'new',
}

/** Ссылка в окне правки: существующая, новая или окно закрыто (null) */
export type EditingLink = ProjectLink | EditTarget.New | null;

/** Сохранение ссылки: новая версия и прежняя (у новой - null) */
export type LinkSaver = (
  link: ProjectLink,
  before: ProjectLink | null
) => Promise<void>;

/** Пропсы ссылок в настройках проекта */
export interface ProjectLinksEditorProps {
  project: Project;
  /** Ссылки можно добавлять, править и переставлять */
  isEditable: boolean;
}

/** Состояние и обработчики ссылок в настройках */
export interface UseProjectLinksEditorResult {
  links: ProjectLink[];
  sortableLinks: SortableLink[];
  canReorder: boolean;
  showEmptyNote: boolean;
  isDialogOpen: boolean;
  editedLink: ProjectLink | null;
  isSaving: boolean;
  onLinkEdit: (link: ProjectLink) => void;
  onAddClick: () => void;
  onDialogClose: () => void;
  onLinkSave: LinkSaver;
  onLinkDelete: (link: ProjectLink) => Promise<void>;
  onLinksReorder: (from: string, to: string) => void;
}

/** Пропсы строки ссылки в настройках */
export interface LinkRowProps {
  link: ProjectLink;
  /** Ручка перетаскивания; без перестановки - null */
  handle: ReactNode;
  isEditable: boolean;
  onEdit: (link: ProjectLink) => void;
}

/** Пропсы окна ссылки */
export interface LinkDialogProps {
  isOpen: boolean;
  /** Ссылка для правки; у новой - null */
  link: ProjectLink | null;
  links: readonly ProjectLink[];
  directions: ProjectDirection[];
  isSaving: boolean;
  onClose: () => void;
  onSave: LinkSaver;
  onDelete: (link: ProjectLink) => Promise<void>;
}

/** Пропсы формы ссылки */
export type LinkFormProps = Omit<LinkDialogProps, 'isOpen'>;

/** Состояние и обработчики формы ссылки */
export interface UseLinkFormResult {
  url: string;
  name: string;
  directions: ProjectDirection[];
  isNameTaken: boolean;
  onDirectionToggle: (direction: ProjectDirection) => void;
  isDeleting: boolean;
  setIsDeleting: (isDeleting: boolean) => void;
  canSave: boolean;
  isUrlInvalid: boolean;
  title: string;
  deleteTitle: string;
  pickedService: Service | undefined;
  serviceLabel: string;
  selectedServiceId: string;
  handleServiceChoose: (id: string) => void;
  onFormSubmit: (event: FormEvent) => Promise<void>;
  onUrlChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  onUrlKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onNameChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onDeleteClick: () => void;
  onDeleteConfirm: () => Promise<void>;
}

/** Пропсы пункта меню сервисов */
export interface ServiceMenuItemProps {
  service: Service;
  selectedServiceId: string;
  onChoose: (id: string) => void;
}

/** Пропсы ссылок внизу страницы проекта */
export interface ProjectLinksBarProps {
  project: Project;
  className?: string;
}

/** Пропсы плашки ссылки */
export interface LinkChipProps {
  link: ProjectLink;
}

/** Выбор направления ссылки */
export interface DirectionChoiceProps {
  direction: ProjectDirection;
  selected: ProjectDirection[];
  onToggle: (direction: ProjectDirection) => void;
}
