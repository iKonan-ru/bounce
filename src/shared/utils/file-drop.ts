/** Совпадает ли файл с accept поля выбора, включая расширения и группы MIME */
export function checkIsFileAccepted(
  file: Pick<File, 'name' | 'type'>,
  accept: string
): boolean {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();

  return accept.split(',').some((entry) => {
    const rule = entry.trim().toLowerCase();

    if (rule.startsWith('.')) {
      return name.endsWith(rule);
    }

    if (rule.endsWith('/*')) {
      return type.startsWith(rule.slice(0, -1));
    }

    return type === rule;
  });
}

/** До отпускания браузер скрывает имена; неизвестный тип оставляет зоны доступными */
export function checkCanDropFiles(
  transfer: DataTransfer,
  accept: string
): boolean {
  if (!Array.from(transfer.types).includes('Files')) {
    return false;
  }

  const items = Array.from(transfer.items).filter(
    (item) => item.kind === 'file'
  );

  return (
    items.length === 0 ||
    items.some(
      (item) =>
        !item.type || checkIsFileAccepted({ name: '', type: item.type }, accept)
    )
  );
}
