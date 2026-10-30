import { Check, ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { ProjectDirection } from '@/entities/project';
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
  Checkbox,
} from '@/shared/ui';
import { ALL_SERVICES } from '../constants/project-links';
import { useLinkForm } from '../hooks/use-link-form';
import type {
  ServiceMenuItemProps,
  LinkFormProps,
  DirectionChoiceProps,
} from '../types/project-links';

/** Сервис в меню выбора: знак, название и отметка выбранного */
function ServiceMenuItem({
  service,
  selectedServiceId,
  onChoose,
}: ServiceMenuItemProps): ReactNode {
  const isOtherService = service.id === OTHER_SERVICE.id;
  const isSelected = service.id === selectedServiceId;
  const onServiceSelect = (): void => {
    onChoose(service.id);
  };
  let mark: ReactNode = null;

  if (isSelected) {
    mark = <Check className="size-4 shrink-0" />;
  }

  return (
    <>
      {isOtherService && <DropdownMenuSeparator />}
      <DropdownMenuItem onSelect={onServiceSelect} className="gap-2.5">
        <ServiceIcon service={service} className="size-4" />
        <span className="flex-1 truncate">{service.name}</span>
        {mark}
      </DropdownMenuItem>
    </>
  );
}

/** Форма ссылки: площадка, адрес, собственное название и удаление */
export function LinkForm(props: LinkFormProps): ReactNode {
  const { link, onClose, isSaving } = props;
  const {
    url,
    name,
    directions,
    isNameTaken,
    onDirectionToggle,
    isDeleting,
    setIsDeleting,
    canSave,
    isUrlInvalid,
    title,
    deleteTitle,
    pickedService,
    serviceLabel,
    selectedServiceId,
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
            placeholder="https://..."
            value={url}
            onChange={onUrlChange}
            onKeyDown={onUrlKeyDown}
            aria-invalid={isUrlInvalid}
            className="min-h-10 min-w-0 flex-1 resize-none py-2 break-all"
          />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="link-name">Название</Label>
        <Input
          id="link-name"
          maxLength={OTHER_NAME_MAX}
          placeholder="Группа, личная страница..."
          value={name}
          onChange={onNameChange}
          aria-invalid={isNameTaken}
        />
        {isNameTaken && (
          <p className="text-sm text-led-red">
            Такое название на этой площадке уже есть
          </p>
        )}
      </div>
      {props.directions.length > 1 && (
        <div className="flex flex-wrap gap-4">
          {props.directions.map((direction) => (
            <DirectionChoice
              key={direction}
              direction={direction}
              selected={directions}
              onToggle={onDirectionToggle}
            />
          ))}
        </div>
      )}
      <DialogFooter className="sm:justify-between">
        {link ? (
          <Button
            type="button"
            variant="ghost"
            className="text-led-red hover:text-led-red"
            onClick={onDeleteClick}
            disabled={isSaving}
          >
            Удалить
          </Button>
        ) : (
          <span className="hidden sm:block" />
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSaving}
          >
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
          isBusy={isSaving}
          onConfirm={onDeleteConfirm}
        />
      )}
    </form>
  );
}

/** Привязка аккаунта видна только при нескольких направлениях */
function DirectionChoice({
  direction,
  selected,
  onToggle,
}: DirectionChoiceProps): ReactNode {
  const checked = selected.includes(direction);
  const label = direction === ProjectDirection.music ? 'Музыка' : 'Видео';
  const onChange = (): void => onToggle(direction);

  return (
    <label className="flex min-h-11 items-center gap-2">
      <Checkbox checked={checked} onCheckedChange={onChange} />
      {label}
    </label>
  );
}
