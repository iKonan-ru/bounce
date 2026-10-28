// Последний открытый проект: с него стартует приложение. Только удобство этого устройства.
const KEY = 'bounce.project';

export function rememberProject(id: string): void {
  try {
    localStorage.setItem(KEY, id);
  } catch {
    // без хранилища просто откроется список проектов
  }
}

export function lastProject(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}
