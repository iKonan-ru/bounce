import type { ChangeEvent, KeyboardEvent, FormEvent } from 'react';
import { useState } from 'react';
import type { ProjectLink } from '@/entities/project';
import {
  normalizeUrl,
  OTHER_SERVICE,
  getServiceByUrl,
  MUSIC_SERVICES,
  getLinkMeta,
} from '@/entities/service';
import {
  WHITESPACE_RE,
  SUBMIT_KEY,
  ALL_SERVICES,
} from '../constants/project-links';
import type { LinkFormProps, UseLinkFormResult } from '../types/project-links';

/** Адрес, сервис и название ссылки в форме; сохранение и удаление */
export function useLinkForm({
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
