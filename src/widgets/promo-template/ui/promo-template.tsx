import type { ReactNode } from 'react';
import { AddRow } from '@/features/mentions';
import { GROUP_ROWS } from '@/shared/constants';
import { Section } from '@/shared/ui';
import { TITLE_MAX_LENGTH } from '../constants/promo-template';
import { usePromoTemplate } from '../hooks/use-promo-template';
import type { PromoTemplateProps } from '../types/promo-template';
import { PromoRow } from './promo-row';

/**
 * Промо-план проекта: какие публикации кнопка "Добавить промо-план" создаст у песни и когда
 * относительно релиза; комментарий становится текстом публикации
 *
 * Правят редакторы и владелец, как этапы новых песен
 */
export function PromoTemplate({
  projectId,
  canEdit,
}: PromoTemplateProps): ReactNode {
  const {
    steps,
    showEmpty,
    openId,
    isAdding,
    onStepToggle,
    onStepSave,
    onStepRemove,
    onStepAdd,
  } = usePromoTemplate(projectId, canEdit);

  return (
    <Section title="Промо-план">
      <div className={GROUP_ROWS}>
        {steps.map((step) => {
          const isOpen = openId === step.id;

          return (
            <PromoRow
              key={step.id}
              step={step}
              canEdit={canEdit}
              isOpen={isOpen}
              onToggle={onStepToggle}
              onSave={onStepSave}
              onRemove={onStepRemove}
            />
          );
        })}
        {showEmpty && (
          <p className="px-4 py-3 text-sm text-dim">Публикаций нет</p>
        )}
        {canEdit && (
          <AddRow
            id="new-promo-step"
            label="Добавить публикацию"
            maxLength={TITLE_MAX_LENGTH}
            isBusy={isAdding}
            onAdd={onStepAdd}
          />
        )}
      </div>
    </Section>
  );
}
