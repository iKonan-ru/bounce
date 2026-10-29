import { Check, ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { OTHER_SERVICE, ServiceIcon, OTHER_NAME_MAX } from '@/entities/service';
import {
  DropdownMenuSeparator,
  DropdownMenuItem,
  DialogHeader,
  DialogTitle,
  Label,
  DropdownMenu,
  DropdownMenuTrigger,
  Button,
  DropdownMenuContent,
  Textarea,
  Input,
  DialogFooter,
  ConfirmDialog,
} from '@/shared/ui';
import { ALL_SERVICES } from '../constants/project-links';
import { useLinkForm } from '../hooks/use-link-form';
import type {
  ServiceMenuItemProps,
  LinkFormProps,
} from '../types/project-links';

/** Сервис в меню выбора: знак, название и отметка выбранного или занятого */
function ServiceMenuItem({
  service,
  selectedServiceId,
  checkIsServiceFree,
  onChoose,
}: ServiceMenuItemProps): ReactNode {
  const isOtherService = service.id === OTHER_SERVICE.id;
  const isSelected = service.id === selectedServiceId;
  const isFree = checkIsServiceFree(service.id);
  const onServiceSelect = (): void => {
    onChoose(service.id);
  };
  let mark: ReactNode = null;

  if (!isFree) {
    mark = <span className="text-xs text-dim">уже есть</span>;
  }

  if (isSelected) {
    mark = <Check className="size-4 shrink-0" />;
  }

  return (
    <>
      {isOtherService && <DropdownMenuSeparator />}
      <DropdownMenuItem
        disabled={!isFree}
        onSelect={onServiceSelect}
        className="gap-2.5"
      >
        <ServiceIcon service={service} className="size-4" />
        <span className="flex-1 truncate">{service.name}</span>
        {mark}
      </DropdownMenuItem>
    </>
  );
}

/** Форма ссылки: сервис, адрес, название "другой" ссылки и удаление */
export function LinkForm(props: LinkFormProps): ReactNode {
  const { link, onClose } = props;
  const {
    url,
    name,
    isOther,
    isDeleting,
    setIsDeleting,
    canSave,
    isUrlInvalid,
    title,
    deleteTitle,
    pickedService,
    serviceLabel,
    selectedServiceId,
    checkIsServiceFree,
    handleServiceChoose,
    onFormSubmit,
    onUrlChange,
    onUrlKeyDown,
    onNameChange,
    onDeleteClick,
    onDeleteConfirm,
  } = useLinkForm(props);

  return (
    <form noValidate onSubmit={onFormSubmit} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle className="break-words">{title}</DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-2">
        <Label htmlFor="link-url" className="sr-only">
          Ссылка
        </Label>
        {/* слева сервис (сам находится по адресу, можно выбрать), справа адрес: поле растёт по
            ссылке, она видна целиком */}
        <div className="flex items-start gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                aria-label={serviceLabel}
                title={pickedService?.name}
                className="h-10 shrink-0 gap-1.5 px-2.5 font-normal"
              >
                {pickedService ? (
                  <ServiceIcon service={pickedService} className="size-4" />
                ) : (
                  <span className="text-dim">Сервис</span>
                )}
                <ChevronDown className="size-4 shrink-0 text-dim" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="max-h-80 min-w-52 overflow-y-auto"
            >
              {ALL_SERVICES.map((service) => (
                <ServiceMenuItem
                  key={service.id}
                  service={service}
                  selectedServiceId={selectedServiceId}
                  checkIsServiceFree={checkIsServiceFree}
                  onChoose={handleServiceChoose}
                />
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Textarea
            id="link-url"
            inputMode="url"
            autoFocus
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            rows={1}
            placeholder="https://music.yandex.ru/..."
            value={url}
            onChange={onUrlChange}
            onKeyDown={onUrlKeyDown}
            aria-invalid={isUrlInvalid}
            className="min-h-10 min-w-0 flex-1 resize-none py-2 break-all"
          />
        </div>
      </div>
      {isOther && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="link-name">Название</Label>
          <Input
            id="link-name"
            maxLength={OTHER_NAME_MAX}
            placeholder="Bandcamp, сайт группы..."
            value={name}
            onChange={onNameChange}
          />
        </div>
      )}
      <DialogFooter className="sm:justify-between">
        {link ? (
          <Button
            type="button"
            variant="ghost"
            className="text-led-red hover:text-led-red"
            onClick={onDeleteClick}
          >
            Удалить
          </Button>
        ) : (
          <span className="hidden sm:block" />
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button type="button" variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button type="submit" disabled={!canSave}>
            Сохранить
          </Button>
        </div>
      </DialogFooter>
      {link && (
        <ConfirmDialog
          open={isDeleting}
          onOpenChange={setIsDeleting}
          title={deleteTitle}
          confirmLabel="Удалить"
          onConfirm={onDeleteConfirm}
        />
      )}
    </form>
  );
}
