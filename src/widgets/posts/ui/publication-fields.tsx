import type { ReactNode } from 'react';
import { getServiceById, MUSIC_SERVICES } from '@/entities/service';
import { getTimezoneLabel } from '@/entities/video-post';
import { Input, Label, MenuSelect, DateField, PropRow } from '@/shared/ui';
import type { PublicationFieldsProps } from '../types/publishing';

/** Основные поля; зона определяется устройством, без лишнего выбора */
export function PublicationFieldsEditor(
  props: PublicationFieldsProps
): ReactNode {
  const { fields, disabled } = props;
  const accountOptions = [
    { value: '', label: 'Выбрать аккаунт' },
    ...props.accounts.map((link) => ({
      value: link.id,
      label: `${link.name} / ${getServiceById(MUSIC_SERVICES, link.service)?.name ?? link.service}`,
    })),
  ];

  return (
    <>
      <div className="grid gap-2">
        <Label htmlFor="publication-title">Название</Label>
        <Input
          id="publication-title"
          name="title"
          maxLength={300}
          value={fields.title}
          disabled={disabled}
          onChange={props.onTextChange}
        />
      </div>
      <PropRow label="Аккаунт">
        <MenuSelect
          className="max-w-full"
          label="Аккаунт публикации"
          value={fields.account}
          options={accountOptions}
          onChange={props.onAccountChange}
          disabled={disabled}
        />
      </PropRow>
      <PropRow label="Дата">
        <DateField
          value={fields.date}
          onChange={props.onDateChange}
          disabled={disabled}
          isQuiet
        />
      </PropRow>
      <PropRow label="Время">
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
          <Input
            aria-label="Время публикации"
            type="time"
            name="time"
            className="w-36 max-w-full"
            value={fields.time}
            onChange={props.onTextChange}
            disabled={disabled}
          />
          <span className="text-xs text-dim" title={fields.timezone}>
            {getTimezoneLabel(fields.timezone, fields.date)}
          </span>
        </div>
      </PropRow>
    </>
  );
}
