import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { Segmented } from '@/components/segmented';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatKey, keyName, parseKey, type SongKey, TONICS } from '@/lib/keys';
import { cn } from '@/lib/utils';

// Выбор тональности: лад (мажор/минор) и тоника - сеткой нот; набрать произвольный текст нельзя.
export function KeyPicker({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (key: string) => void;
  disabled?: boolean;
}) {
  const current = parseKey(value);
  const [open, setOpen] = useState(false);
  const [minor, setMinor] = useState(current?.minor ?? false);

  function pick(k: SongKey) {
    const next = formatKey(k);
    if (next !== value) onChange(next);
    setOpen(false);
  }

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setMinor(current?.minor ?? false);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id="song-key"
          variant="ghost"
          disabled={disabled}
          className="-mr-2 h-9 gap-1.5 px-2 font-normal"
        >
          {current ? (
            <>
              <span className="font-medium">{formatKey(current)}</span>
              <span className="text-dim">{keyName(current)}</span>
            </>
          ) : (
            <span className="text-dim">не указана</span>
          )}
          <ChevronDown className="size-4 text-dim" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-3">
        <Segmented
          label="Лад"
          value={minor ? 'minor' : 'major'}
          onChange={(v) => setMinor(v === 'minor')}
          options={[
            { value: 'major', label: 'Мажор' },
            { value: 'minor', label: 'Минор' },
          ]}
        />
        <div className="grid grid-cols-4 gap-1">
          {TONICS.map((tonic) => {
            const k = { tonic, minor };
            const selected = current?.tonic === tonic && current.minor === minor;
            return (
              <button
                key={tonic}
                type="button"
                title={keyName(k)}
                aria-pressed={selected}
                onClick={() => pick(k)}
                className={cn(
                  'h-10 rounded-lg text-sm font-medium transition-colors md:h-9',
                  selected ? 'bg-tape text-tape-ink' : 'bg-groove/50 hover:bg-groove',
                )}
              >
                {formatKey(k)}
              </button>
            );
          })}
        </div>
        {current && (
          <Button
            variant="ghost"
            className="h-9 w-full font-normal text-dim"
            onClick={() => {
              onChange('');
              setOpen(false);
            }}
          >
            Убрать тональность
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}
