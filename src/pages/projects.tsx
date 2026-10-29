import { Plus } from 'lucide-react';
import {
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
  useState,
} from 'react';
import { toast } from 'sonner';
import { ProjectAvatar } from '@/components/images';
import { Loading } from '@/components/loading';
import { MembersPicker } from '@/components/members-picker';
import { type Crumb, EmptyState, GROUP, PageHeader } from '@/components/page';
import { AvatarStack } from '@/components/people-picker';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMe } from '@/lib/auth';
import type { Project } from '@/lib/model';
import { pb } from '@/lib/pb';
import { createProject, type Roles } from '@/lib/projects';
import { projectsQuery } from '@/lib/queries';
import { queryKeys } from '@/lib/query-keys';
import { getProjectPeople } from '@/lib/roles';
import { cn } from '@/lib/utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';

/** Список проектов - корень пути: хлебных крошек нет */
const NO_CRUMBS: readonly Crumb[] = [];

/** Сколько аватаров участников показать на карточке проекта */
const CARD_AVATARS_MAX = 5;

/** Карточка проекта в списке */
const PROJECT_CARD_CLASS_NAME = cn(
  GROUP,
  'flex items-center gap-4 p-4 transition-colors hover:bg-groove/40 active:bg-groove/70'
);

/** Пропсы карточки проекта */
interface ProjectCardProps {
  project: Project;
}

/** Карточка проекта: аватар, название и участники */
function ProjectCard({ project }: ProjectCardProps): ReactNode {
  const people = getProjectPeople(project).map((person) => person.user);
  const linkParams = { projectId: project.id };

  return (
    <li>
      <Link
        to="/p/$projectId"
        params={linkParams}
        className={PROJECT_CARD_CLASS_NAME}
      >
        <ProjectAvatar
          project={project}
          className="size-12 rounded-xl text-lg"
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{project.name}</span>
          <AvatarStack
            users={people}
            maxCount={CARD_AVATARS_MAX}
            className="mt-1.5"
          />
        </span>
      </Link>
    </li>
  );
}

/** Состояние страницы проектов */
interface UseProjectsPageResult {
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

/** Список проектов и окно нового проекта (открыто, пока в адресе ?create) */
function useProjectsPage(): UseProjectsPageResult {
  const projects = useQuery(projectsQuery);
  const me = useMe();
  const canCreate = me?.canCreateProjects === true;
  const { create } = useSearch({ from: '/app/projects' });
  const navigate = useNavigate();

  const onCreateOpenChange = (isOpen: boolean): void => {
    if (isOpen) {
      void navigate({
        to: '/projects',
        search: { create: true },
        replace: true,
      });

      return;
    }

    void navigate({ to: '/projects', search: {}, replace: true });
  };

  const onCreateClick = (): void => {
    onCreateOpenChange(true);
  };

  const isCreateRequested = create === true;
  const isCreateOpen = isCreateRequested && canCreate;
  const isLoadFailed = projects.isError && !projects.data;

  return {
    projects: projects.data,
    isPending: projects.isPending,
    isLoadFailed,
    isEmpty: projects.data?.length === 0,
    canCreate,
    isCreateOpen,
    onCreateClick,
    onCreateOpenChange,
  };
}

/** Список проектов */
export function ProjectsPage(): ReactNode {
  const {
    projects,
    isPending,
    isLoadFailed,
    isEmpty,
    canCreate,
    isCreateOpen,
    onCreateClick,
    onCreateOpenChange,
  } = useProjectsPage();

  const createButton = canCreate && (
    <Button onClick={onCreateClick}>
      <Plus data-icon="inline-start" />
      Новый проект
    </Button>
  );

  return (
    <>
      <PageHeader crumbs={NO_CRUMBS} title="Проекты" actions={createButton} />
      {isPending && <Loading className="h-20 rounded-xl" />}
      {isLoadFailed && <p className="text-led-red">Проекты не загрузились.</p>}
      {isEmpty && <EmptyState>Проектов пока нет</EmptyState>}
      <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {projects?.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </ul>
      <NewProjectDialog open={isCreateOpen} onOpenChange={onCreateOpenChange} />
    </>
  );
}

/** Пропсы окна нового проекта */
interface NewProjectDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

/** Состояние формы нового проекта */
interface UseNewProjectDialogResult {
  /** Владелец нового проекта - текущий пользователь; без входа - нет */
  ownerId: string | undefined;
  name: string;
  roles: Roles;
  setRoles: (roles: Roles) => void;
  isCreating: boolean;
  isSubmitDisabled: boolean;
  onNameChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onFormSubmit: (event: FormEvent) => void;
  onCancelClick: () => void;
}

/** Название и участники нового проекта; после создания - переход в проект */
function useNewProjectDialog(
  onOpenChange: NewProjectDialogProps['onOpenChange']
): UseNewProjectDialogResult {
  const me = useMe();
  const client = useQueryClient();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [roles, setRoles] = useState<Roles>({});

  const create = useMutation({
    mutationFn: (): Promise<Project> => {
      if (!me) {
        throw new Error('нет входа');
      }

      return createProject(pb, { name, owner: me.id, roles });
    },
    onSuccess: async (project) => {
      await client.invalidateQueries({ queryKey: queryKeys.projects.all });
      setName('');
      setRoles({});
      await navigate({
        to: '/p/$projectId',
        params: { projectId: project.id },
      });
    },
    onError: () => {
      toast.error('Проект не создан: проверьте соединение');
    },
  });

  const hasName = name.trim() !== '';

  const onFormSubmit = (event: FormEvent): void => {
    event.preventDefault();
    const canSubmit = hasName && !create.isPending;

    if (canSubmit) {
      create.mutate();
    }
  };

  const onNameChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setName(event.target.value);
  };

  const onCancelClick = (): void => {
    onOpenChange(false);
  };

  const isSubmitDisabled = create.isPending || !hasName;

  return {
    ownerId: me?.id,
    name,
    roles,
    setRoles,
    isCreating: create.isPending,
    isSubmitDisabled,
    onNameChange,
    onFormSubmit,
    onCancelClick,
  };
}

/** Окно нового проекта */
function NewProjectDialog({
  open,
  onOpenChange,
}: NewProjectDialogProps): ReactNode {
  const {
    ownerId,
    name,
    roles,
    setRoles,
    isCreating,
    isSubmitDisabled,
    onNameChange,
    onFormSubmit,
    onCancelClick,
  } = useNewProjectDialog(onOpenChange);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={onFormSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Новый проект</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="project-name">Название</Label>
            <Input
              id="project-name"
              required
              autoFocus
              maxLength={120}
              value={name}
              onChange={onNameChange}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">Участники</span>
            {ownerId && (
              <MembersPicker
                ownerId={ownerId}
                value={roles}
                onChange={setRoles}
                disabled={isCreating}
              />
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={onCancelClick}>
              Отмена
            </Button>
            <Button type="submit" disabled={isSubmitDisabled}>
              Создать
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
