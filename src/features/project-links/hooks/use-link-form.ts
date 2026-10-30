import type { ChangeEvent, KeyboardEvent, FormEvent } from 'react';
import { useState } from 'react';
import type { ProjectLink, ProjectDirection } from '@/entities/project';
import {
  normalizeUrl,
  OTHER_SERVICE,
  getServiceByUrl,
  MUSIC_SERVICES,
  getLinkMeta,
} from '@/entities/service';
import { getNewRecordId } from '@/shared/utils';
import {
  WHITESPACE_RE,
  SUBMIT_KEY,
  ALL_SERVICES,
} from '../constants/project-links';
import type { LinkFormProps, UseLinkFormResult } from '../types/project-links';

/** Адрес, сервис и название ссылки в форме; сохранение и удаление */
export function useLinkForm({
  link,
  links,
  directions: availableDirections,
  isSaving,
  onClose,
  onSave,
  onDelete,
}: LinkFormProps): UseLinkFormResult {
  const [url, setUrl] = useState(link?.url ?? '');
  const [service, setService] = useState(link?.service ?? '');
  const [name, setName] = useState(link?.name ?? '');
  const [directions, setDirections] = useState(
    link?.directions ?? availableDirections
  );
  // сервис, выбранный руками, ссылка уже не меняет
  const [isServiceChosen, setIsServiceChosen] = useState(Boolean(link));
  const [isDeleting, setIsDeleting] = useState(false);
  const normalized = normalizeUrl(url);
  const isNameTaken = links.some(
    (candidate) =>
      candidate.id !== link?.id &&
      candidate.service === service &&
      candidate.name.trim().toLowerCase() === name.trim().toLowerCase()
  );
  const canSave =
    normalized !== null &&
    service !== '' &&
    name.trim() !== '' &&
    !isNameTaken &&
    directions.length > 0 &&
    !isSaving;
  const getServiceForUrl = (normalizedUrl: string): string =>
    getServiceByUrl(MUSIC_SERVICES, normalizedUrl)?.id ?? OTHER_SERVICE.id;
  const onDirectionToggle = (direction: ProjectDirection): void => {
    setDirections((current) =>
      current.includes(direction)
        ? current.filter((item) => item !== direction)
        : [...current, direction]
    );
  };

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
  const onFormSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();

    if (!canSave) {
      return;
    }

    if (!normalized) {
      return;
    }

    const savedLink: ProjectLink = {
      id: link?.id ?? getNewRecordId(),
      service,
      url: normalized,
      name: name.trim(),
      directions,
    };
    try {
      await onSave(savedLink, link);
      onClose();
    } catch {
      // Редактор показывает ошибку, введенные данные остаются в открытой форме.
    }
  };
  const onDeleteClick = (): void => {
    setIsDeleting(true);
  };
  const onDeleteConfirm = async (): Promise<void> => {
    if (!link) {
      return;
    }

    try {
      await onDelete(link);
      setIsDeleting(false);
      onClose();
    } catch {
      // Причина отказа видна в сообщении редактора.
    }
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
    directions,
    isNameTaken,
    onDirectionToggle,
    isDeleting,
    setIsDeleting,
    canSave,
    isUrlInvalid: hasUrl && normalized === null,
    title,
    deleteTitle: `Удалить ссылку \u00AB${title}\u00BB?`,
    pickedService,
    serviceLabel: `Сервис: ${pickedService?.name ?? 'не выбран'}`,
    selectedServiceId: service,
    handleServiceChoose,
    onFormSubmit,
    onUrlChange,
    onUrlKeyDown,
    onNameChange,
    onDeleteClick,
    onDeleteConfirm,
  };
}
