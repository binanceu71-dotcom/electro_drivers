/**
 * Безопасное копирование текста в буфер обмена.
 *
 * `navigator.clipboard.writeText` может бросать/отклоняться (`SecurityError`,
 * `NotAllowedError`), а в небезопасном контексте (HTTP, iframe без разрешений)
 * `navigator.clipboard` вообще отсутствует. Прямые вызовы без обработки
 * оставляли необработанные Promise-rejection и вводили пользователя в
 * заблуждение. Функция пробует современный Clipboard API, затем — fallback
 * через временный `textarea` + `document.execCommand('copy')`.
 *
 * Возвращает `true`, если копирование удалось, иначе `false`.
 */
export async function safeCopyToClipboard(text: string): Promise<boolean> {
  // 1. Современный Clipboard API
  try {
    if (
      typeof navigator !== 'undefined' &&
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === 'function'
    ) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Переходим к fallback ниже.
  }

  // 2. Fallback для небезопасных контекстов и старых браузеров
  try {
    if (typeof document === 'undefined') return false;
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = '0';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } finally {
      document.body.removeChild(textarea);
    }
    return ok;
  } catch {
    return false;
  }
}
