import type { ReactNode } from 'react';
import type { SectionButtonProps } from '../types/page';
import { cn } from '../utils/cn';
import { Button } from './kit/button';

/**
 * Действие в строке заголовка секции, справа: тихая кнопка со значком ("Добавить промо-план",
 * "Добавить этапы из шаблона")
 *
 * Отступы слева и справа одинаковые, правый край - по краю списка
 */
export function SectionButton({
  icon,
  children,
  className,
  ...props
}: SectionButtonProps): ReactNode {
  const buttonClassName = cn(
    '-mr-1 h-8 gap-1.5 px-2 text-sm font-normal text-dim hover:text-ink [&_svg]:size-4',
    className
  );

  return (
    <Button variant="ghost" size="sm" className={buttonClassName} {...props}>
      {icon}
      {children}
    </Button>
  );
}
