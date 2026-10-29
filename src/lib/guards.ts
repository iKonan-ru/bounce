// Проверки значений неизвестного типа: ответы сервера, разобранный JSON, ошибки.

/** Объект с полями неизвестного типа */
export interface AbstractObject {
  [key: string]: unknown;
}

/** Значение - объект (не null) */
export function checkIsObject(value: unknown): value is AbstractObject {
  return typeof value === 'object' && value !== null;
}

/** У значения есть строковое поле field */
export function checkHasStringField<Field extends string>(
  value: unknown,
  field: Field
): value is Record<Field, string> {
  if (!checkIsObject(value)) {
    return false;
  }

  return typeof Reflect.get(value, field) === 'string';
}

/** Числовое поле field значения; нет поля или оно не число - undefined */
export function getNumberField(
  value: unknown,
  field: string
): number | undefined {
  if (!checkIsObject(value)) {
    return undefined;
  }

  const fieldValue: unknown = Reflect.get(value, field);

  if (typeof fieldValue !== 'number') {
    return undefined;
  }

  return fieldValue;
}

/** Поле field значения как есть; у не-объекта - undefined */
export function getField(value: unknown, field: string): unknown {
  if (!checkIsObject(value)) {
    return undefined;
  }

  return Reflect.get(value, field);
}
