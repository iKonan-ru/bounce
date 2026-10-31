import { Plus, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { ProjectDirection } from '@/entities/project';
import { AddProjectLink } from '@/features/project-links';
import { GROUP_ROWS } from '@/shared/constants';
import { Section, Button, Loading } from '@/shared/ui';
import { useVideoPromo } from '../hooks/use-video-promo';
import type { VideoPromoTemplateProps } from '../types/publishing';
import { PromoDialog } from './promo-dialog';

/** Отдельный промо-план видео в настройках */
export function VideoPromoTemplate({
  projectId,
  canEdit,
}: VideoPromoTemplateProps): ReactNode {
  const state = useVideoPromo(projectId);

  return (
    <Section title="Промо видео">
      {state.isPending && <Loading className="h-20 rounded-xl" />}
      {state.isError && (
        <p className="text-sm text-led-red">Промо-план не загрузился.</p>
      )}
      <div className={GROUP_ROWS}>
        {state.steps.map((step) => {
          const onOpen = (): void => state.onOpen(step.id);

          return (
            <button
              key={step.id}
              type="button"
              className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left hover:bg-groove/40"
              onClick={onOpen}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate">{step.title}</span>
                <span className="block truncate text-xs text-dim">
                  {state.getAccountName(step.account)}
                </span>
              </span>
              <ChevronRight className="size-4 text-dim" />
            </button>
          );
        })}
        {canEdit && state.hasAccounts && (
          <Button
            variant="ghost"
            className="w-full justify-start rounded-none px-4"
            onClick={state.onCreate}
          >
            <Plus className="size-4" />
            Добавить публикацию
          </Button>
        )}
        {canEdit && !state.hasAccounts && state.isOwner && (
          <AddProjectLink
            projectId={projectId}
            direction={ProjectDirection.video}
          />
        )}
        {!state.isPending && state.steps.length === 0 && !canEdit && (
          <p className="px-4 py-3 text-sm text-dim">Публикаций нет</p>
        )}
      </div>
      {(state.openId === 'new' || state.template) && (
        <PromoDialog
          projectId={projectId}
          template={state.template}
          canEdit={canEdit}
          onClose={state.onClose}
        />
      )}
    </Section>
  );
}
