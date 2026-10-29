import type { ReactNode } from 'react';
import { ServiceIcon } from '@/components/service-icon';
import { POST_PLATFORMS, type Service } from '@/lib/services';
import { cn } from '@/lib/utils';

/** Пропсы кнопок площадок */
interface PlatformTogglesProps {
  /** Выбранные площадки (id) */
  value: readonly string[];
  /** Нажатие на площадку; isSelected - была ли она выбрана до нажатия */
  onToggle: (id: string, isSelected: boolean) => void;
}

/** Пропсы кнопки одной площадки */
interface PlatformToggleProps {
  platform: Service;
  isSelected: boolean;
  onToggle: (id: string, isSelected: boolean) => void;
}

/** Кнопка одной площадки: нажатая - выбрана */
function PlatformToggle({
  platform,
  isSelected,
  onToggle,
}: PlatformToggleProps): ReactNode {
  const onToggleClick = (): void => {
    onToggle(platform.id, isSelected);
  };
  const toggleClassName = cn(
    'flex h-9 items-center gap-1.5 rounded-full px-3 text-sm ring-1 transition-colors',
    {
      'bg-tape text-tape-ink ring-transparent': isSelected,
      'text-dim ring-border/70 hover:text-ink dark:ring-border/40': !isSelected,
    }
  );

  return (
    <button
      type="button"
      aria-pressed={isSelected}
      onClick={onToggleClick}
      className={toggleClassName}
    >
      <ServiceIcon service={platform} className="size-4" />
      {platform.name}
    </button>
  );
}

/**
 * Кнопки площадок публикации: нажатая - выбрана
 *
 * Новый список считает вызывающий: у публикации - в порядке нажатий, в промо-плане - в порядке
 * площадок
 */
export function PlatformToggles({
  value,
  onToggle,
}: PlatformTogglesProps): ReactNode {
  return POST_PLATFORMS.map((platform) => {
    const isSelected = value.includes(platform.id);

    return (
      <PlatformToggle
        key={platform.id}
        platform={platform}
        isSelected={isSelected}
        onToggle={onToggle}
      />
    );
  });
}
