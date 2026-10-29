// Последний открытый проект: с него стартует приложение. Только удобство этого устройства.

/** Ключ последнего открытого проекта в localStorage */
const LAST_PROJECT_KEY = 'bounce.project';

/** Запомнить проект как последний открытый */
export function rememberProject(id: string): void {
  try {
    localStorage.setItem(LAST_PROJECT_KEY, id);
  } catch (error) {
    // без хранилища просто откроется список проектов
    console.error(error);
  }
}

/** Последний открытый проект; null - не запомнен */
export function getLastProject(): string | null {
  try {
    return localStorage.getItem(LAST_PROJECT_KEY);
  } catch {
    return null;
  }
}

/** Проект удалили или закрыли к нему доступ: старт - снова со списка проектов */
export function forgetProject(id: string): void {
  try {
    if (localStorage.getItem(LAST_PROJECT_KEY) === id) {
      localStorage.removeItem(LAST_PROJECT_KEY);
    }
  } catch (error) {
    // без хранилища и помнить нечего
    console.error(error);
  }
}
