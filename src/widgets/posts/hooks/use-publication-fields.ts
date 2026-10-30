import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { projectQuery, ProjectDirection } from '@/entities/project';
import { getPublicationFields } from '@/entities/video-post';
import type {
  VideoPost,
  VideoPromo,
  PublicationFields,
} from '@/entities/video-post';
import { useQuery } from '@tanstack/react-query';

/** Форма сохраняет ввод до успешного ответа сервера */
export function usePublicationFields(
  projectId: string,
  record?: VideoPost | VideoPromo
) {
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
  const onAnchorChange = (anchor: string): void =>
    change({ anchor: anchor as PublicationFields['anchor'] });
  const onDateChange = (date: string): void => change({ date });
  const onOffsetChange = (event: ChangeEvent<HTMLInputElement>): void =>
    change({ offset: Number(event.target.value) });
  const canSave =
    fields.title.trim() !== '' &&
    accounts.some((link) => link.id === fields.account) &&
    Number.isInteger(fields.offset) &&
    Math.abs(fields.offset) <= 365;

  return {
    fields,
    scheduledAt: record && 'scheduled_at' in record ? record.scheduled_at : '',
    accounts,
    canSave,
    onTextChange,
    onAccountChange,
    onAnchorChange,
    onDateChange,
    onOffsetChange,
  };
}
