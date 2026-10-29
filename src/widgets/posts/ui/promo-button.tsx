import { Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import { SectionButton } from '@/shared/ui';
import { usePromoButton } from '../hooks/use-promo-button';
import type { PromoButtonProps } from '../types/promo-button';

/**
 * Промо-план песни: набор публикаций из настроек проекта, вокруг релиза, одной кнопкой
 *
 * Пустой набор - кнопки нет
 */
export function PromoButton({ song, meId }: PromoButtonProps): ReactNode {
  const { hasSteps, isBusy, onAddClick } = usePromoButton({ song, meId });

  if (!hasSteps) {
    return null;
  }

  const sparklesIcon = <Sparkles />;

  return (
    <SectionButton icon={sparklesIcon} disabled={isBusy} onClick={onAddClick}>
      Добавить промо-план
    </SectionButton>
  );
}
