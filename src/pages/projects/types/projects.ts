import type { ChangeEvent, FormEvent } from 'react';
import type { Project, Roles, ProjectDirection } from '@/entities/project';

/** Пропсы карточки проекта */
export interface ProjectCardProps {
  project: Project;
}

/** Состояние страницы проектов */
export interface UseProjectsPageResult {
  projects: Project[] | undefined;
  isPending: boolean;
  /** Проекты не загрузились и показать нечего */
  isLoadFailed: boolean;
  isEmpty: boolean;
  canCreate: boolean;
  /** Открыто окно нового проекта */
  isCreateOpen: boolean;
  onCreateClick: () => void;
  onCreateOpenChange: (isOpen: boolean) => void;
}

/** Пропсы окна нового проекта */
export interface NewProjectDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

/** Состояние формы нового проекта */
export interface UseNewProjectDialogResult {
  isReleaseEnabled: boolean;
  onReleaseChange: (checked: boolean | 'indeterminate') => void;
  /** Владелец нового проекта - текущий пользователь; без входа - нет */
  ownerId: string | undefined;
  name: string;
  directions: ProjectDirection[];
  setDirections: (directions: ProjectDirection[]) => void;
  roles: Roles;
  setRoles: (roles: Roles) => void;
  isCreating: boolean;
  isSubmitDisabled: boolean;
  onNameChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onFormSubmit: (event: FormEvent) => void;
  onCancelClick: () => void;
}
