import { Check, ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  SONG_STATUS_LABEL,
  getSongStatus,
  MANUAL_SONG_STATUSES,
  KeyPicker,
} from '@/entities/song';
import { GROUP_ROWS } from '@/shared/constants';
import {
  DropdownMenuItem,
  Section,
  PropRow,
  DropdownMenu,
  DropdownMenuTrigger,
  Button,
  DropdownMenuContent,
  AutosaveInput,
} from '@/shared/ui';
import { NON_DIGIT_RE, MIN_BPM, MAX_BPM } from '../constants/song-edit';
import { useSongForm } from '../hooks/use-song-form';
import type { StatusMenuItemProps, SongFormProps } from '../types/song-edit';

/** Оставить в темпе только цифры */
function filterDigits(value: string): string {
  return value.replace(NON_DIGIT_RE, '');
}

/** Темп можно сохранить: пусто или число в разумных пределах */
function checkIsValidBpm(value: string): boolean {
  if (value === '') {
    return true;
  }

  const bpm = Number(value);

  return bpm >= MIN_BPM && bpm <= MAX_BPM;
}

/** Темп для поля: без темпа - пусто */
function getBpmValue(bpm: number | undefined): string {
  if (!bpm) {
    return '';
  }

  return String(bpm);
}

/** Пункт меню статуса: выбор другого статуса сохраняет его */
function StatusMenuItem({
  status,
  currentStatus,
  onStatusSelect,
}: StatusMenuItemProps): ReactNode {
  const isCurrent = status === currentStatus;
  const onItemSelect = (): void => {
    if (!isCurrent) {
      onStatusSelect(status);
    }
  };

  return (
    <DropdownMenuItem onSelect={onItemSelect}>
      <span className="flex-1">{SONG_STATUS_LABEL[status]}</span>
      {isCurrent && <Check className="size-4" />}
    </DropdownMenuItem>
  );
}

/** Поля песни сохраняются сами: при уходе из поля, выборе статуса или даты */
export function SongForm({ song }: SongFormProps): ReactNode {
  const { onStatusSelect, onBpmSave, onKeyChange } = useSongForm(song);
  const statusLabel = SONG_STATUS_LABEL[getSongStatus(song)];
  const bpmValue = getBpmValue(song.bpm);
  const keyValue = song.key ?? '';

  return (
    <Section title="Песня">
      <div className={GROUP_ROWS}>
        <PropRow label="Статус">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="-mr-2 h-9 gap-1.5 px-2 font-normal"
              >
                {statusLabel}
                <ChevronDown className="size-4 text-dim" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-40">
              {MANUAL_SONG_STATUSES.map((status) => (
                <StatusMenuItem
                  key={status}
                  status={status}
                  currentStatus={song.status}
                  onStatusSelect={onStatusSelect}
                />
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </PropRow>
        <PropRow label="Темп, BPM">
          <AutosaveInput
            id="song-bpm"
            inputMode="numeric"
            placeholder="-"
            maxLength={3}
            value={bpmValue}
            filter={filterDigits}
            validate={checkIsValidBpm}
            onSave={onBpmSave}
          />
        </PropRow>
        <PropRow label="Тональность">
          <KeyPicker value={keyValue} onChange={onKeyChange} />
        </PropRow>
      </div>
    </Section>
  );
}
