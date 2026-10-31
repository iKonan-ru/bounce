import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { projectQuery, ProjectDirection } from '@/entities/project';
import { getPublicationFields } from '@/entities/video-post';
import type { VideoPost, PublicationFields } from '@/entities/video-post';
import { useQuery } from '@tanstack/react-query';

/** Форма сохраняет ввод до успешного ответа сервера */
export function usePublicationFields(projectId: string, record?: VideoPost) {
  const [fields, setFields] = useState(() => getPublicationFields(record));
  const project = useQuery(projectQuery(projectId));
  const accounts = (project.data?.links ?? []).filter((link) =>
    link.directions.includes(ProjectDirection.video)
  );
  const change = (patch: Partial<PublicationFields>): void =>
    setFields((current) => ({ ...current, ...patch }));
  const onTextChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ): void => change({ [event.target.name]: event.target.value });
  const onAccountChange = (account: string): void => change({ account });
  const onDateChange = (date: string): void => change({ date });
  const canSave =
    fields.title.trim() !== '' &&
    accounts.some((link) => link.id === fields.account);

  return {
    fields,
    accounts,
    canSave,
    onTextChange,
    onAccountChange,
    onDateChange,
  };
}
