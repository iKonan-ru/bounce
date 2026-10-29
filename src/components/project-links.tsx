import { Check, ChevronDown, ExternalLink, Plus } from 'lucide-react';
import {
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
  useState,
} from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { GROUP_ROWS } from '@/components/page';
import { ServiceIcon } from '@/components/service-icon';
import { SortableList } from '@/components/sortable';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getSafeUrl } from '@/lib/markup';
import type { Project, ProjectLink } from '@/lib/model';
import { Collections, getCollection, pb } from '@/lib/pb';
import { queryKeys } from '@/lib/query-keys';
import {
  getLinkMeta,
  getProjectLinks,
  getServiceByUrl,
  MUSIC_SERVICES,
  normalizeUrl,
  OTHER_NAME_MAX,
  OTHER_SERVICE,
  type Service,
} from '@/lib/services';
import { moveItemById } from '@/lib/stages';
import { cn } from '@/lib/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';

/** Ссылка в списке с перетаскиванием: свой id у каждой */
interface SortableLink {
  id: string;
  link: ProjectLink;
}

/** Что правится в окне ссылки */
enum EditTarget {
  /** Новая ссылка, ещё не сохранённая */
  New = 'new',
}

/** Ссылка в окне правки: существующая, новая или окно закрыто (null) */
type EditingLink = ProjectLink | EditTarget.New | null;

/** Сохранение ссылки: новая версия и прежняя (у новой - null) */
type LinkSaver = (link: ProjectLink, before: ProjectLink | null) => void;

/** Пропсы ссылок в настройках проекта */
interface ProjectLinksEditorProps {
  project: Project;
  /** Ссылки можно добавлять, править и переставлять */
  isEditable: boolean;
}

/** Состояние и обработчики ссылок в настройках */
interface UseProjectLinksEditorResult {
  links: ProjectLink[];
  sortableLinks: SortableLink[];
  canReorder: boolean;
  showEmptyNote: boolean;
  isDialogOpen: boolean;
  editedLink: ProjectLink | null;
  takenServices: string[];
  onLinkEdit: (link: ProjectLink) => void;
  onAddClick: () => void;
  onDialogClose: () => void;
  onLinkSave: LinkSaver;
  onLinkDelete: (link: ProjectLink) => void;
  onLinksReorder: (from: string, to: string) => void;
}

/** Пропсы строки ссылки в настройках */
interface LinkRowProps {
  link: ProjectLink;
  /** Ручка перетаскивания; без перестановки - null */
  handle: ReactNode;
  isEditable: boolean;
  onEdit: (link: ProjectLink) => void;
}

/** Пропсы окна ссылки */
interface LinkDialogProps {
  isOpen: boolean;
  /** Ссылка для правки; у новой - null */
  link: ProjectLink | null;
  /** Сервисы из списка, у которых ссылка уже есть */
  taken: readonly string[];
  onClose: () => void;
  onSave: LinkSaver;
  onDelete: (link: ProjectLink) => void;
}

/** Пропсы формы ссылки */
type LinkFormProps = Omit<LinkDialogProps, 'isOpen'>;

/** Состояние и обработчики формы ссылки */
interface UseLinkFormResult {
  url: string;
  name: string;
  isOther: boolean;
  isDeleting: boolean;
  setIsDeleting: (isDeleting: boolean) => void;
  canSave: boolean;
  isUrlInvalid: boolean;
  title: string;
  deleteTitle: string;
  pickedService: Service | undefined;
  serviceLabel: string;
  selectedServiceId: string;
  checkIsServiceFree: (id: string) => boolean;
  handleServiceChoose: (id: string) => void;
  onFormSubmit: (event: FormEvent) => void;
  onUrlChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  onUrlKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onNameChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onDeleteClick: () => void;
  onDeleteConfirm: () => void;
}

/** Пропсы пункта меню сервисов */
interface ServiceMenuItemProps {
  service: Service;
  selectedServiceId: string;
  checkIsServiceFree: (id: string) => boolean;
  onChoose: (id: string) => void;
}

/** Пропсы ссылок внизу страницы проекта */
interface ProjectLinksBarProps {
  project: Project;
  className?: string;
}

/** Пропсы плашки ссылки */
interface LinkChipProps {
  link: ProjectLink;
}

/** Строка ссылки в настройках */
const LINK_ROW_CLASS_NAME =
  'flex min-h-12 items-center gap-3 px-4 transition-colors md:min-h-11';

/** Пробелы в вставленной ссылке */
const WHITESPACE_RE = /\s+/g;

/** Все сервисы в меню: из списка и "другое" в конце */
const ALL_SERVICES: readonly Service[] = [...MUSIC_SERVICES, OTHER_SERVICE];

/** Клавиша отправки формы из поля ссылки */
const SUBMIT_KEY = 'Enter';

/** Одна и та же ссылка: сервис, адрес и название совпадают */
function checkIsSameLink(first: ProjectLink, second: ProjectLink): boolean {
  const isSameService = first.service === second.service;
  const isSameUrl = first.url === second.url;
  const isSameName = (first.name ?? '') === (second.name ?? '');

  return [isSameService, isSameUrl, isSameName].every(Boolean);
}

/**
 * Место той же ссылки в списке: по значению, а не по объекту
 *
 * После перечитывания проекта (правка соавтора, возврат на вкладку) объекты в списке новые
 */
function getLinkIndex(all: readonly ProjectLink[], link: ProjectLink): number {
  return all.findIndex((candidate) => checkIsSameLink(candidate, link));
}

/** Ключ формы ссылки: другая ссылка - форма с начальными значениями */
function getLinkFormKey(link: ProjectLink | null): string {
  if (!link) {
    return EditTarget.New;
  }

  return `${link.service}-${link.url}`;
}

/** Список ссылок, правка, удаление и перестановка */
function useProjectLinksEditor({
  project,
  isEditable,
}: ProjectLinksEditorProps): UseProjectLinksEditorResult {
  const client = useQueryClient();
  const [editing, setEditing] = useState<EditingLink>(null);
  const all = project.links ?? [];
  const links = getProjectLinks(project);

  const save = useMutation({
    mutationFn: (next: ProjectLink[]) =>
      getCollection(pb, Collections.Projects).update(project.id, {
        links: next,
      }),
    onSettled: () =>
      client.invalidateQueries({ queryKey: queryKeys.projects.all }),
    onError: () => toast.error('Ссылка не сохранилась: проверьте соединение'),
  });

  // правка заменяет прежнюю запись; у сервиса из списка ссылка одна - старая уходит
  const onLinkSave: LinkSaver = (link, before) => {
    let editedIndex = -1;

    if (before) {
      editedIndex = getLinkIndex(all, before);
    }

    const isOtherLink = link.service === OTHER_SERVICE.id;
    const checkIsKept = (candidate: ProjectLink, index: number): boolean => {
      if (index === editedIndex) {
        return false;
      }

      const isDifferentService = candidate.service !== link.service;

      return isOtherLink || isDifferentService;
    };
    const next = all.filter(checkIsKept);
    // на место прежней: столько оставшихся ссылок, сколько стояло перед ней
    let insertIndex = next.length;

    if (editedIndex >= 0) {
      insertIndex = all.slice(0, editedIndex).filter(checkIsKept).length;
    }

    next.splice(insertIndex, 0, link);
    save.mutate(next);
  };
  const onLinkDelete = (link: ProjectLink): void => {
    const deletedIndex = getLinkIndex(all, link);

    if (deletedIndex >= 0) {
      save.mutate(all.filter((_, index) => index !== deletedIndex));
    }
  };

  // для перетаскивания: свой id у каждой ссылки, одинаковые "другие" различаются номером
  const sortableLinks = links.map((link, index) => ({
    id: `${index}:${link.service}:${link.url}`,
    link,
  }));
  const onLinksReorder = (from: string, to: string): void => {
    save.mutate(
      moveItemById(sortableLinks, from, to).map(
        (sortableLink) => sortableLink.link
      )
    );
  };
  const onLinkEdit = (link: ProjectLink): void => {
    setEditing(link);
  };
  const onAddClick = (): void => {
    setEditing(EditTarget.New);
  };
  const onDialogClose = (): void => {
    setEditing(null);
  };

  let editedLink: ProjectLink | null = null;

  if (editing !== EditTarget.New) {
    editedLink = editing;
  }

  const hasLinks = links.length > 0;
  const hasSortableLinks = sortableLinks.length > 0;
  const takenServices = links
    .map((link) => link.service)
    .filter((id) => id !== OTHER_SERVICE.id);

  return {
    links,
    sortableLinks,
    canReorder: isEditable && hasSortableLinks,
    showEmptyNote: !hasLinks && !isEditable,
    isDialogOpen: editing !== null,
    editedLink,
    takenServices,
    onLinkEdit,
    onAddClick,
    onDialogClose,
    onLinkSave,
    onLinkDelete,
    onLinksReorder,
  };
}

/** Строка ссылки в настройках: знак, название (по нажатию - правка) и переход */
function LinkRow({
  link,
  handle,
  isEditable,
  onEdit,
}: LinkRowProps): ReactNode {
  const meta = getLinkMeta(link);

  if (!meta) {
    return null;
  }

  const rowClassName = cn(LINK_ROW_CLASS_NAME, {
    'group/row pl-1 hover:bg-groove/30': isEditable,
  });
  const editLabel = `Изменить ссылку: ${meta.label}`;
  const openLabel = `Открыть: ${meta.label}`;
  const href = getSafeUrl(link.url) ?? undefined;
  const onEditClick = (): void => {
    onEdit(link);
  };

  return (
    <div className={rowClassName}>
      {handle}
      <ServiceIcon service={meta.service} className="text-dim" />
      {isEditable ? (
        <button
          type="button"
          onClick={onEditClick}
          className="flex min-h-12 min-w-0 flex-1 items-center text-left md:min-h-11"
          aria-label={editLabel}
        >
          <span className="truncate">{meta.label}</span>
        </button>
      ) : (
        <span className="min-w-0 flex-1 truncate">{meta.label}</span>
      )}
      {/* подсвечивается только знаком: подложка - одна на всю строку, как у этапов */}
      <Button
        variant="ghost"
        size="icon-sm"
        className="-mr-2 text-dim hover:bg-transparent hover:text-ink dark:hover:bg-transparent"
        asChild
      >
        <a href={href} target="_blank" rel="noreferrer" aria-label={openLabel}>
          <ExternalLink />
        </a>
      </Button>
    </div>
  );
}

/**
 * Ссылки в настройках: только добавленные - название и кнопка перехода
 *
 * Порядок меняется перетаскиванием (так же они идут на странице проекта); сам адрес виден и
 * правится в окне, где сервис узнаётся по вставленной ссылке сам. "Другое" - со своим
 * названием, таких ссылок может быть несколько
 */
export function ProjectLinksEditor({
  project,
  isEditable,
}: ProjectLinksEditorProps): ReactNode {
  const {
    sortableLinks,
    canReorder,
    showEmptyNote,
    isDialogOpen,
    editedLink,
    takenServices,
    onLinkEdit,
    onAddClick,
    onDialogClose,
    onLinkSave,
    onLinkDelete,
    onLinksReorder,
  } = useProjectLinksEditor({ project, isEditable });

  const renderSortableLink = (
    sortableLink: SortableLink,
    handle: ReactNode
  ): ReactNode => (
    <LinkRow
      link={sortableLink.link}
      handle={handle}
      isEditable={isEditable}
      onEdit={onLinkEdit}
    />
  );

  return (
    <>
      <div className={GROUP_ROWS}>
        {canReorder ? (
          <SortableList
            items={sortableLinks}
            onReorder={onLinksReorder}
            className="divide-y divide-border/70 dark:divide-border/50"
            handleClassName="-mr-1 h-12 w-6 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/row:opacity-100 focus-visible:opacity-100"
          >
            {renderSortableLink}
          </SortableList>
        ) : (
          sortableLinks.map((sortableLink) => (
            <div key={sortableLink.id}>
              <LinkRow
                link={sortableLink.link}
                handle={null}
                isEditable={isEditable}
                onEdit={onLinkEdit}
              />
            </div>
          ))
        )}
        {showEmptyNote && (
          <p className="px-4 py-3 text-sm text-dim">Ссылок пока нет</p>
        )}
        {isEditable && (
          <button
            type="button"
            onClick={onAddClick}
            className="flex min-h-12 w-full items-center gap-3 px-4 text-left text-dim transition-colors hover:bg-groove/40 hover:text-ink md:min-h-11"
          >
            <Plus className="size-5 shrink-0" />
            Добавить ссылку
          </button>
        )}
      </div>
      <LinkDialog
        isOpen={isDialogOpen}
        link={editedLink}
        taken={takenServices}
        onClose={onDialogClose}
        onSave={onLinkSave}
        onDelete={onLinkDelete}
      />
    </>
  );
}

/** Окно правки или добавления ссылки */
function LinkDialog({
  isOpen,
  link,
  taken,
  onClose,
  onSave,
  onDelete,
}: LinkDialogProps): ReactNode {
  const formKey = getLinkFormKey(link);
  const onOpenChange = (isNextOpen: boolean): void => {
    if (!isNextOpen) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-y-auto sm:max-w-lg">
        {isOpen && (
          <LinkForm
            key={formKey}
            link={link}
            taken={taken}
            onClose={onClose}
            onSave={onSave}
            onDelete={onDelete}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Адрес, сервис и название ссылки в форме; сохранение и удаление */
function useLinkForm({
  link,
  taken,
  onClose,
  onSave,
  onDelete,
}: LinkFormProps): UseLinkFormResult {
  const [url, setUrl] = useState(link?.url ?? '');
  const [service, setService] = useState(link?.service ?? '');
  const [name, setName] = useState(link?.name ?? '');
  // сервис, выбранный руками, ссылка уже не меняет
  const [isServiceChosen, setIsServiceChosen] = useState(Boolean(link));
  const [isDeleting, setIsDeleting] = useState(false);
  const normalized = normalizeUrl(url);
  const isOther = service === OTHER_SERVICE.id;

  const checkIsServiceFree = (id: string): boolean => {
    const isOtherService = id === OTHER_SERVICE.id;
    const isOwnService = id === link?.service;

    return [isOtherService, isOwnService, !taken.includes(id)].some(Boolean);
  };
  // ссылка не на сервис из списка (или его ссылка уже есть) - значит "другое"
  const getServiceForUrl = (normalizedUrl: string): string => {
    const found = getServiceByUrl(MUSIC_SERVICES, normalizedUrl);

    if (!found) {
      return OTHER_SERVICE.id;
    }

    if (!checkIsServiceFree(found.id)) {
      return OTHER_SERVICE.id;
    }

    return found.id;
  };

  const isNameFilled = !isOther || name.trim() !== '';
  const canSave = [
    normalized !== null,
    service !== '',
    checkIsServiceFree(service),
    isNameFilled,
  ].every(Boolean);

  const onUrlChange = (event: ChangeEvent<HTMLTextAreaElement>): void => {
    const nextUrl = event.target.value.replace(WHITESPACE_RE, '');
    setUrl(nextUrl);

    if (isServiceChosen) {
      return;
    }

    const nextNormalized = normalizeUrl(nextUrl);

    if (!nextNormalized) {
      return;
    }

    setService(getServiceForUrl(nextNormalized));
  };
  const onUrlKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key !== SUBMIT_KEY) {
      return;
    }

    event.preventDefault();
    const { form } = event.currentTarget;

    if (form) {
      form.requestSubmit();
    }
  };
  const onNameChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setName(event.target.value);
  };
  const handleServiceChoose = (id: string): void => {
    setService(id);
    setIsServiceChosen(true);
  };
  const onFormSubmit = (event: FormEvent): void => {
    event.preventDefault();

    if (!canSave) {
      return;
    }

    if (!normalized) {
      return;
    }

    const savedLink: ProjectLink = { service, url: normalized };

    if (isOther) {
      savedLink.name = name.trim();
    }

    onSave(savedLink, link);
    onClose();
  };
  const onDeleteClick = (): void => {
    setIsDeleting(true);
  };
  const onDeleteConfirm = (): void => {
    if (!link) {
      return;
    }

    onDelete(link);
    setIsDeleting(false);
    onClose();
  };

  let title = 'Новая ссылка';

  if (link) {
    title = getLinkMeta(link)?.label ?? 'Ссылка';
  }

  const pickedService = ALL_SERVICES.find(
    (candidate) => candidate.id === service
  );
  const hasUrl = url.trim() !== '';

  return {
    url,
    name,
    isOther,
    isDeleting,
    setIsDeleting,
    canSave,
    isUrlInvalid: hasUrl && normalized === null,
    title,
    deleteTitle: `Удалить ссылку \u00AB${title}\u00BB?`,
    pickedService,
    serviceLabel: `Сервис: ${pickedService?.name ?? 'не выбран'}`,
    selectedServiceId: service,
    checkIsServiceFree,
    handleServiceChoose,
    onFormSubmit,
    onUrlChange,
    onUrlKeyDown,
    onNameChange,
    onDeleteClick,
    onDeleteConfirm,
  };
}

/** Сервис в меню выбора: знак, название и отметка выбранного или занятого */
function ServiceMenuItem({
  service,
  selectedServiceId,
  checkIsServiceFree,
  onChoose,
}: ServiceMenuItemProps): ReactNode {
  const isOtherService = service.id === OTHER_SERVICE.id;
  const isSelected = service.id === selectedServiceId;
  const isFree = checkIsServiceFree(service.id);
  const onServiceSelect = (): void => {
    onChoose(service.id);
  };
  let mark: ReactNode = null;

  if (!isFree) {
    mark = <span className="text-xs text-dim">уже есть</span>;
  }

  if (isSelected) {
    mark = <Check className="size-4 shrink-0" />;
  }

  return (
    <>
      {isOtherService && <DropdownMenuSeparator />}
      <DropdownMenuItem
        disabled={!isFree}
        onSelect={onServiceSelect}
        className="gap-2.5"
      >
        <ServiceIcon service={service} className="size-4" />
        <span className="flex-1 truncate">{service.name}</span>
        {mark}
      </DropdownMenuItem>
    </>
  );
}

/** Форма ссылки: сервис, адрес, название "другой" ссылки и удаление */
function LinkForm(props: LinkFormProps): ReactNode {
  const { link, onClose } = props;
  const {
    url,
    name,
    isOther,
    isDeleting,
    setIsDeleting,
    canSave,
    isUrlInvalid,
    title,
    deleteTitle,
    pickedService,
    serviceLabel,
    selectedServiceId,
    checkIsServiceFree,
    handleServiceChoose,
    onFormSubmit,
    onUrlChange,
    onUrlKeyDown,
    onNameChange,
    onDeleteClick,
    onDeleteConfirm,
  } = useLinkForm(props);

  return (
    <form noValidate onSubmit={onFormSubmit} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle className="break-words">{title}</DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-2">
        <Label htmlFor="link-url" className="sr-only">
          Ссылка
        </Label>
        {/* слева сервис (сам находится по адресу, можно выбрать), справа адрес: поле растёт по
            ссылке, она видна целиком */}
        <div className="flex items-start gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                aria-label={serviceLabel}
                title={pickedService?.name}
                className="h-10 shrink-0 gap-1.5 px-2.5 font-normal"
              >
                {pickedService ? (
                  <ServiceIcon service={pickedService} className="size-4" />
                ) : (
                  <span className="text-dim">Сервис</span>
                )}
                <ChevronDown className="size-4 shrink-0 text-dim" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="max-h-80 min-w-52 overflow-y-auto"
            >
              {ALL_SERVICES.map((service) => (
                <ServiceMenuItem
                  key={service.id}
                  service={service}
                  selectedServiceId={selectedServiceId}
                  checkIsServiceFree={checkIsServiceFree}
                  onChoose={handleServiceChoose}
                />
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Textarea
            id="link-url"
            inputMode="url"
            autoFocus
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            rows={1}
            placeholder="https://music.yandex.ru/..."
            value={url}
            onChange={onUrlChange}
            onKeyDown={onUrlKeyDown}
            aria-invalid={isUrlInvalid}
            className="min-h-10 min-w-0 flex-1 resize-none py-2 break-all"
          />
        </div>
      </div>
      {isOther && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="link-name">Название</Label>
          <Input
            id="link-name"
            maxLength={OTHER_NAME_MAX}
            placeholder="Bandcamp, сайт группы..."
            value={name}
            onChange={onNameChange}
          />
        </div>
      )}
      <DialogFooter className="sm:justify-between">
        {link ? (
          <Button
            type="button"
            variant="ghost"
            className="text-led-red hover:text-led-red"
            onClick={onDeleteClick}
          >
            Удалить
          </Button>
        ) : (
          <span className="hidden sm:block" />
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button type="button" variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button type="submit" disabled={!canSave}>
            Сохранить
          </Button>
        </div>
      </DialogFooter>
      {link && (
        <ConfirmDialog
          open={isDeleting}
          onOpenChange={setIsDeleting}
          title={deleteTitle}
          confirmLabel="Удалить"
          onConfirm={onDeleteConfirm}
        />
      )}
    </form>
  );
}

/** Плашка ссылки: знак и название, при наведении знак становится фирменного цвета */
function LinkChip({ link }: LinkChipProps): ReactNode {
  const meta = getLinkMeta(link);

  if (!meta) {
    return null;
  }

  const href = getSafeUrl(link.url) ?? undefined;

  return (
    <li>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="group/brand flex h-10 items-center gap-2 rounded-full bg-panel px-3.5 text-sm text-dim ring-1 ring-border/70 transition-colors hover:text-ink md:h-9 dark:bg-white/5 dark:ring-border/40"
      >
        <ServiceIcon
          service={meta.service}
          shouldBrandOnHover
          className="size-[1.125rem]"
        />
        {meta.label}
      </a>
    </li>
  );
}

/** Ссылки внизу страницы проекта: плашки со знаком и названием */
export function ProjectLinksBar({
  project,
  className,
}: ProjectLinksBarProps): ReactNode {
  const links = getProjectLinks(project);

  if (links.length === 0) {
    return null;
  }

  const listClassName = cn('flex flex-wrap gap-2', className);

  return (
    <ul aria-label="Ссылки" className={listClassName}>
      {links.map((link, index) => (
        // ключ - позиция: у "другого" может совпасть и сервис, и адрес
        <LinkChip key={`${link.service}-${index}`} link={link} />
      ))}
    </ul>
  );
}
