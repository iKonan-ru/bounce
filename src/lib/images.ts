import { RELEASE_COVER_SIZE } from './model';

// Размер картинки в браузере, без загрузки на сервер.
export async function imageSize(file: Blob): Promise<{ width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  const size = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return size;
}

// Обложка для релиза: JPEG ровно 3000x3000. Возвращает причину отказа или null.
export async function releaseCoverProblem(file: File): Promise<string | null> {
  if (file.type !== 'image/jpeg') return 'Нужен файл JPEG';
  try {
    const { width, height } = await imageSize(file);
    if (width !== RELEASE_COVER_SIZE || height !== RELEASE_COVER_SIZE) {
      return `Нужно ${RELEASE_COVER_SIZE}x${RELEASE_COVER_SIZE}, у этого файла ${width}x${height}`;
    }
  } catch {
    return 'Картинку не удалось прочитать';
  }
  return null;
}

// Длинная сторона картинки после уменьшения: хватает для просмотра на весь экран.
export const MAX_IMAGE_SIDE = 2400;
// Файл в пределах размера и не тяжелее этого уходит как есть.
const KEEP_BYTES = 1.5 * 1024 * 1024;

function renamed(name: string, ext: string): string {
  const dot = name.lastIndexOf('.');
  return `${dot > 0 ? name.slice(0, dot) : name || 'image'}.${ext}`;
}

// есть ли в картинке прозрачные точки (проверяется каждая 16-я)
function hasAlpha(ctx: CanvasRenderingContext2D, width: number, height: number): boolean {
  const data = ctx.getImageData(0, 0, width, height).data;
  for (let i = 3; i < data.length; i += 64) if ((data[i] ?? 255) < 255) return true;
  return false;
}

// Уменьшает картинку перед загрузкой: фото с телефона в 6000 точек и 10 МБ превращается в
// JPEG 2400 точек на 0.5-1 МБ, поэтому загрузка и уменьшенные копии на сервере идут быстро.
// HEIC, который браузер умеет открыть, становится JPEG. Анимированный GIF, маленькие файлы и
// всё, что браузер прочитать не смог, уходят без изменений.
export async function shrinkImage(file: File, maxSide = MAX_IMAGE_SIDE): Promise<File> {
  if (file.type === 'image/gif' || file.type === 'image/svg+xml') return file;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return file;
  }
  try {
    const { width, height } = bitmap;
    const scale = Math.min(1, maxSide / Math.max(width, height));
    const web = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
    if (scale === 1 && web && file.size <= KEEP_BYTES) return file;

    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: false });
    if (!ctx) return file;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, w, h);
    const png = file.type !== 'image/jpeg' && hasAlpha(ctx, w, h);
    const type = png ? 'image/png' : 'image/jpeg';
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, type, png ? undefined : 0.86),
    );
    if (!blob) return file;
    // уменьшать было незачем: свой файл легче
    if (scale === 1 && web && blob.size >= file.size) return file;
    return new File([blob], renamed(file.name, png ? 'png' : 'jpg'), {
      type,
      lastModified: file.lastModified,
    });
  } finally {
    bitmap.close();
  }
}

// Сторона аватара после обрезки: хватает для экранов с высокой плотностью точек.
export const AVATAR_SIDE = 512;

export type CropArea = { x: number; y: number; width: number; height: number };

// Вырезает квадрат area (в точках исходной картинки, с учётом поворота из EXIF) и сводит его к
// side x side. Прозрачность сохраняется в PNG, иначе JPEG.
export async function cropImage(file: File, area: CropArea, side = AVATAR_SIDE): Promise<File> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const out = Math.max(1, Math.min(side, Math.round(area.width)));
    const canvas = document.createElement('canvas');
    canvas.width = out;
    canvas.height = out;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas недоступен');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, area.x, area.y, area.width, area.height, 0, 0, out, out);
    const png = file.type !== 'image/jpeg' && hasAlpha(ctx, out, out);
    const type = png ? 'image/png' : 'image/jpeg';
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, type, png ? undefined : 0.9),
    );
    if (!blob) throw new Error('картинка не собралась');
    return new File([blob], renamed(file.name, png ? 'png' : 'jpg'), { type });
  } finally {
    bitmap.close();
  }
}

// Заранее запросить уменьшенные копии, чтобы сервер их сделал, а браузер положил в кэш: после
// загрузки картинка появляется сразу. Ошибки не важны - копия сделается при первом показе.
export async function warmImages(urls: ReadonlyArray<string | undefined>): Promise<void> {
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, 20000));
  const loads = urls
    .filter((u) => u !== undefined)
    .map((u) => {
      const img = new Image();
      img.src = u;
      return img.decode().catch(() => undefined);
    });
  await Promise.race([Promise.all(loads).then(() => undefined), timeout]);
}
