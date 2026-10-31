import type { ReactNode } from 'react';
import type { ProjectLink } from '@/entities/project';
import { Dialog, DialogContent } from '@/shared/ui';
import type { LinkDialogProps } from '../types/project-links';
import { EditTarget } from '../types/project-links';
import { LinkForm } from './link-form';

/** Ключ формы ссылки: другая ссылка - форма с начальными значениями */
function getLinkFormKey(link: ProjectLink | null): string {
  if (!link) {
    return EditTarget.New;
  }

  return link.id;
}

/** Окно правки или добавления ссылки */
export function LinkDialog({
  isOpen,
  link,
  links,
  directions,
  initialDirection,
  isSaving,
  onClose,
  onSave,
  onDelete,
}: LinkDialogProps): ReactNode {
  const formKey = getLinkFormKey(link);
  const onOpenChange = (isNextOpen: boolean): void => {
    if (!isNextOpen) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-y-auto sm:max-w-lg">
        {isOpen && (
          <LinkForm
            key={formKey}
            link={link}
            links={links}
            directions={directions}
            initialDirection={initialDirection}
            isSaving={isSaving}
            onClose={onClose}
            onSave={onSave}
            onDelete={onDelete}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
