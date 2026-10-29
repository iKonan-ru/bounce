import {
  DEFAULT_IMAGE_NAME,
  ALPHA_OFFSET,
  ALPHA_SAMPLE_STEP,
  OPAQUE_ALPHA,
  JPEG_TYPE,
  PNG_TYPE,
  MAX_IMAGE_SIDE,
  KEEP_AS_IS_TYPES,
  ORIGINAL_SCALE,
  WEB_IMAGE_TYPES,
  KEEP_BYTES,
  SHRINK_JPEG_QUALITY,
  AVATAR_SIDE,
  AVATAR_JPEG_QUALITY,
  WARM_IMAGES_TIMEOUT_MS,
} from '../constants/images';
import type { ImageSize, OutputFormat, CropArea } from '../types/images';
import { delay } from './timers';

/** Размер картинки в браузере, без загрузки на сервер */
export async function getImageSize(file: Blob): Promise<ImageSize> {
  const bitmap = await createImageBitmap(file);
  const size = { width: bitmap.width, height: bitmap.height };
  bitmap.close();

  return size;
}

/** Имя файла с новым расширением */
function getRenamedFileName(name: string, extension: string): string {
  const dotIndex = name.lastIndexOf('.');

  if (dotIndex > 0) {
    return `${name.slice(0, dotIndex)}.${extension}`;
  }

  return `${name || DEFAULT_IMAGE_NAME}.${extension}`;
}

/** Есть ли в картинке прозрачные точки (проверяется каждая 16-я) */
function checkIsTransparent(
  context: CanvasRenderingContext2D,
  width: number,
  height: number
): boolean {
  const { data } = context.getImageData(0, 0, width, height);
  for (
    let index = ALPHA_OFFSET;
    index < data.length;
    index += ALPHA_SAMPLE_STEP
  ) {
    if ((data[index] ?? OPAQUE_ALPHA) < OPAQUE_ALPHA) {
      return true;
    }
  }

  return false;
}

/** Холст в файл нужного типа; null - браузер не собрал картинку */
function convertCanvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, type, quality);
  });
}

/** Тип и расширение картинки: PNG, если есть прозрачность (и это не JPEG), иначе JPEG */
function getOutputFormat(
  file: File,
  context: CanvasRenderingContext2D,
  side: ImageSize
): OutputFormat {
  const isPng =
    file.type !== JPEG_TYPE &&
    checkIsTransparent(context, side.width, side.height);

  if (isPng) {
    return { isPng, type: PNG_TYPE, extension: 'png' };
  }

  return { isPng, type: JPEG_TYPE, extension: 'jpg' };
}

/**
 * Уменьшает картинку перед загрузкой: фото с телефона в 6000 точек и 10 МБ превращается в JPEG
 * 2400 точек на 0.5-1 МБ, поэтому загрузка и уменьшенные копии на сервере идут быстро
 *
 * HEIC, который браузер умеет открыть, становится JPEG. Анимированный GIF, маленькие файлы и
 * всё, что браузер прочитать не смог, уходят без изменений
 */
export async function shrinkImage(
  file: File,
  maxSide = MAX_IMAGE_SIDE
): Promise<File> {
  if (KEEP_AS_IS_TYPES.has(file.type)) {
    return file;
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return file;
  }
  try {
    const { width, height } = bitmap;
    const scale = Math.min(ORIGINAL_SCALE, maxSide / Math.max(width, height));
    const isUnscaledWebImage =
      scale === ORIGINAL_SCALE && WEB_IMAGE_TYPES.has(file.type);

    if (isUnscaledWebImage && file.size <= KEEP_BYTES) {
      return file;
    }

    const target: ImageSize = {
      width: Math.max(1, Math.round(width * scale)),
      height: Math.max(1, Math.round(height * scale)),
    };
    const canvas = document.createElement('canvas');
    canvas.width = target.width;
    canvas.height = target.height;
    const context = canvas.getContext('2d', { willReadFrequently: false });

    if (!context) {
      return file;
    }

    context.imageSmoothingQuality = 'high';
    context.drawImage(bitmap, 0, 0, target.width, target.height);
    const format = getOutputFormat(file, context, target);
    const quality = format.isPng ? undefined : SHRINK_JPEG_QUALITY;
    const blob = await convertCanvasToBlob(canvas, format.type, quality);

    if (!blob) {
      return file;
    }

    // уменьшать было незачем: свой файл легче
    if (isUnscaledWebImage && blob.size >= file.size) {
      return file;
    }

    return new File([blob], getRenamedFileName(file.name, format.extension), {
      type: format.type,
      lastModified: file.lastModified,
    });
  } finally {
    bitmap.close();
  }
}

/**
 * Вырезает квадрат area (в точках исходной картинки, с учётом поворота из EXIF) и сводит его к
 * side x side
 *
 * Прозрачность сохраняется в PNG, иначе JPEG
 */
export async function cropImage(
  file: File,
  area: CropArea,
  side = AVATAR_SIDE
): Promise<File> {
  const bitmap = await createImageBitmap(file, {
    imageOrientation: 'from-image',
  });
  try {
    const outputSide = Math.max(1, Math.min(side, Math.round(area.width)));
    const canvas = document.createElement('canvas');
    canvas.width = outputSide;
    canvas.height = outputSide;
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('canvas недоступен');
    }

    context.imageSmoothingQuality = 'high';
    context.drawImage(
      bitmap,
      area.x,
      area.y,
      area.width,
      area.height,
      0,
      0,
      outputSide,
      outputSide
    );
    const format = getOutputFormat(file, context, {
      width: outputSide,
      height: outputSide,
    });
    const quality = format.isPng ? undefined : AVATAR_JPEG_QUALITY;
    const blob = await convertCanvasToBlob(canvas, format.type, quality);

    if (!blob) {
      throw new Error('картинка не собралась');
    }

    return new File([blob], getRenamedFileName(file.name, format.extension), {
      type: format.type,
    });
  } finally {
    bitmap.close();
  }
}

/** Ссылка есть */
function checkIsDefined(url: string | undefined): url is string {
  return url !== undefined;
}

/** Загрузить картинку в кэш браузера; ошибка не важна */
function preloadImage(url: string): Promise<void> {
  const image = new Image();
  image.src = url;

  return image.decode().catch(() => undefined);
}

/**
 * Заранее запросить уменьшенные копии, чтобы сервер их сделал, а браузер положил в кэш: после
 * загрузки картинка появляется сразу
 *
 * Ошибки не важны - копия сделается при первом показе
 */
export async function warmImages(
  urls: readonly (string | undefined)[]
): Promise<void> {
  const loads = urls.filter(checkIsDefined).map(preloadImage);
  const allLoaded = Promise.all(loads).then(() => undefined);
  await Promise.race([allLoaded, delay(WARM_IMAGES_TIMEOUT_MS)]);
}

/**
 * Несколько картинок - по одной: каждая в памяти раскрывается в полный размер (фото 48 Мп -
 * около 190 МБ), и десяток сразу роняет вкладку на телефоне
 */
export async function shrinkImages(files: readonly File[]): Promise<File[]> {
  const shrunk: File[] = [];
  for (const file of files) {
    shrunk.push(await shrinkImage(file));
  }

  return shrunk;
}
