import type { CSSProperties, ReactNode } from 'react';
import { UPDATE_DELAY_MS } from '../constants/update';

/** Полоса ожидания автообновления; новый ключ уведомления запускает её заново */
export function UpdateProgress(): ReactNode {
  const style: CSSProperties = { animationDuration: `${UPDATE_DELAY_MS}ms` };

  return (
    <span className="app-update-progress" style={style} aria-hidden="true" />
  );
}
