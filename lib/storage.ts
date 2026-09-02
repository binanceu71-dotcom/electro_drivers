/**
 * Безопасный доступ к Web Storage (localStorage / sessionStorage).
 *
 * Прямое обращение к `window.localStorage` / `window.sessionStorage` может бросать
 * `SecurityError` (приватный режим, заблокированные cookie/хранилище) или падать,
 * когда хранилище отключено политиками браузера. Это ломало приложение в белый
 * экран. Все обращения к хранилищу должны идти только через эти хелперы.
 */

export type StorageArea = 'local' | 'session';

function getStorage(area: StorageArea): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    return area === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

/**
 * Безопасное чтение строки из хранилища.
 * Возвращает `null`, если хранилище недоступно или ключ отсутствует.
 */
export function safeGetItem(key: string, area: StorageArea = 'local'): string | null {
  try {
    return getStorage(area)?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

/**
 * Безопасная запись строки в хранилище.
 * Возвращает `true`, если значение было записано, и `false` при любой ошибке
 * (квота, приватный режим и т.п.).
 */
export function safeSetItem(key: string, value: string, area: StorageArea = 'local'): boolean {
  try {
    getStorage(area)?.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Безопасное удаление ключа из хранилища.
 * Ошибки молча игнорируются.
 */
export function safeRemoveItem(key: string, area: StorageArea = 'local'): void {
  try {
    getStorage(area)?.removeItem(key);
  } catch {
    // Хранилище недоступно — нечего удалять.
  }
}
