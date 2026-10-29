import type { ReactNode } from 'react';
import type { StageTemplate } from '@/entities/song';
import { AddRow } from '@/features/mentions';
import { GROUP_ROWS } from '@/shared/constants';
import { Section, Loading, SortableList } from '@/shared/ui';
import { useTemplate } from '../hooks/use-template';
import type {
  TemplateProps,
  TemplateItemProps,
} from '../types/project-settings';
import { TemplateRow } from './template-row';

/** Этапы, с которыми создаются новые песни проекта */
export function Template({ projectId, isEditable }: TemplateProps): ReactNode {
  const {
    templates,
    templateList,
    openTemplateId,
    isAdding,
    hasTemplates,
    isEmpty,
    onTemplatesReorder,
    onTemplateAdd,
    handleTemplateToggle,
  } = useTemplate(projectId);

  const renderTemplateRow = (
    template: StageTemplate,
    handle: ReactNode
  ): ReactNode => {
    const isOpen = openTemplateId === template.id;

    return (
      <TemplateRow
        template={template}
        handle={handle}
        isOpen={isOpen}
        onToggle={handleTemplateToggle}
      />
    );
  };

  return (
    <Section title="Этапы новых песен">
      {templates.isPending && <Loading className="h-24 rounded-xl" />}
      {!isEditable && (
        <ul className={GROUP_ROWS}>
          {templateList.map((template) => (
            <TemplateItem key={template.id} template={template} />
          ))}
          {isEmpty && (
            <li className="px-4 py-3 text-sm text-dim">Этапов нет</li>
          )}
        </ul>
      )}
      {isEditable && (
        <div className={GROUP_ROWS}>
          {hasTemplates && (
            <SortableList
              items={templateList}
              onReorder={onTemplatesReorder}
              className="divide-y divide-border/70 dark:divide-border/50"
              handleClassName="mr-1 h-12 w-6 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/row:opacity-100 focus-visible:opacity-100"
            >
              {renderTemplateRow}
            </SortableList>
          )}
          <AddRow
            id="new-template-stage"
            label="Добавить этап"
            isBusy={isAdding}
            onAdd={onTemplateAdd}
          />
        </div>
      )}
    </Section>
  );
}

/** Этап шаблона только для чтения: название и число подэтапов */
function TemplateItem({ template }: TemplateItemProps): ReactNode {
  const substepCount = (template.substeps ?? []).length;
  const hasSubsteps = substepCount > 0;

  return (
    <li className="flex min-h-12 items-center gap-3 px-4 md:min-h-11">
      <span className="min-w-0 flex-1 truncate">{template.title}</span>
      {hasSubsteps && (
        <span className="shrink-0 text-sm text-dim">{substepCount} подэт.</span>
      )}
    </li>
  );
}
