/** Поле вокруг QR-кода, в модулях */
export const QR_MARGIN = 1;

/** Ширина картинки QR-кода, px */
export const QR_WIDTH = 240;

/** Группы по 4 знака ключа: так его удобнее переписывать руками */
export const SECRET_GROUP_RE = /(.{4})/g;

/** Замена группы ключа: она же и пробел после неё */
export const SECRET_GROUP_REPLACEMENT = '$1 ';

/** Всё, что не цифра: в поле кода остаются только цифры */
export const NON_DIGIT_RE = /\D/g;

/** Сколько цифр в коде 2FA */
export const TOTP_CODE_LENGTH = 6;
