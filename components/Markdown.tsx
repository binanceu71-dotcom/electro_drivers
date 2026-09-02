'use client';

import React from 'react';
import { ExternalLink, Video, Check } from 'lucide-react';

/**
 * Единый рендерер Markdown для всего портала (статьи + предпросмотр редактора).
 *
 * Блоки: ## / ### заголовки, ```код```, таблицы, ![img](url), [video: url](подпись),
 * чек-листы - [ ] / - [x] (интерактивные), > цитаты, ---, списки, параграфы.
 * Инлайн: **жирный**, *курсив*, __подчеркнутый__/<u>, ~~зачеркнутый~~, `код`, [ссылка](url).
 */

interface MarkdownProps {
  content: string;
  /** Переопределения состояния чек-боксов (индекс задачи -> отмечено). */
  taskStates?: Record<number, boolean>;
  /** Клик по чек-боксу. Если не передан — чек-боксы только для чтения. */
  onTaskToggle?: (taskIndex: number, checked: boolean) => void;
}

const VIDEO_EXT_RE = /\.(mp4|webm|ogv|ogg|mov|m4v)(\?.*)?$/i;

function isDirectVideo(url: string): boolean {
  return VIDEO_EXT_RE.test(url) || (url.startsWith('/api/uploads/') && VIDEO_EXT_RE.test(url));
}

/** Чинит вложенные ссылки вида [text]([https://a](https://a)) — берём внутренний URL */
function sanitizeUrl(url: string): string {
  const nested = url.match(/^\[.*?\]\((.*?)\)$/);
  if (nested) return nested[1];
  return url.replace(/^\[|\]$/g, '');
}

// ================= INLINE PARSER =================

const INLINE_RE = new RegExp(
  [
    '(`[^`\\n]+`)',                       // 1: `code`
    '(\\*\\*[^*\\n]+\\*\\*)',             // 2: **bold**
    '(__[^_\\n]+__)',                     // 3: __underline__
    '(<u>[\\s\\S]*?</u>)',                // 4: <u>underline</u>
    '(~~[^~\\n]+~~)',                     // 5: ~~strike~~
    '(\\*[^*\\s][^*\\n]*\\*)',            // 6: *italic*
    '(_[^_\\s][^_\\n]*_)',                // 7: _italic_
    '(!?\\[[^\\]\\n]*\\]\\([^)\\n]*\\))', // 8: [link](url) / ![img](url)
  ].join('|'),
  'g'
);

export function parseInline(raw: string, keyPrefix = 'i'): React.ReactNode {
  if (!raw) return raw;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let k = 0;
  INLINE_RE.lastIndex = 0;
  let m: RegExpExecArray | null;

  while ((m = INLINE_RE.exec(raw)) !== null) {
    if (m.index > lastIndex) parts.push(raw.substring(lastIndex, m.index));
    const token = m[0];
    const key = `${keyPrefix}-${k++}`;

    if (token.startsWith('`')) {
      parts.push(
        <code key={key} className="px-1 py-0.5 rounded bg-neutral-800 dark:bg-neutral-800 light:bg-neutral-200 font-mono text-[11px] text-neutral-200 dark:text-neutral-200 light:text-neutral-900">
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('**')) {
      parts.push(
        <strong key={key} className="font-bold text-neutral-100 dark:text-neutral-100 light:text-black">
          {parseInline(token.slice(2, -2), key)}
        </strong>
      );
    } else if (token.startsWith('__')) {
      parts.push(<u key={key}>{parseInline(token.slice(2, -2), key)}</u>);
    } else if (token.startsWith('<u>')) {
      parts.push(<u key={key}>{parseInline(token.slice(3, -4), key)}</u>);
    } else if (token.startsWith('~~')) {
      parts.push(
        <s key={key} className="text-neutral-500">{parseInline(token.slice(2, -2), key)}</s>
      );
    } else if (token.startsWith('*')) {
      parts.push(<em key={key} className="italic">{parseInline(token.slice(1, -1), key)}</em>);
    } else if (token.startsWith('_')) {
      parts.push(<em key={key} className="italic">{parseInline(token.slice(1, -1), key)}</em>);
    } else if (token.startsWith('![')) {
      const im = token.match(/^!\[([^\]]*)\]\(([^)]*)\)$/);
      if (im) {
        parts.push(
          <img key={key} src={sanitizeUrl(im[2])} alt={im[1]} className="inline-block max-h-64 rounded-lg my-1" />
        );
      } else {
        parts.push(token);
      }
    } else if (token.startsWith('[')) {
      const lm = token.match(/^\[([^\]]*)\]\(([^)]*)\)$/);
      if (lm) {
        const url = sanitizeUrl(lm[2]);
        parts.push(
          <a
            key={key}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-neutral-100 dark:text-neutral-100 light:text-black font-semibold hover:opacity-80 inline-flex items-center gap-0.5 break-all"
          >
            <span>{parseInline(lm[1] || url, key)}</span>
            <ExternalLink className="w-3 h-3 inline shrink-0" />
          </a>
        );
      } else {
        parts.push(token);
      }
    } else {
      parts.push(token);
    }
    lastIndex = m.index + token.length;
  }

  if (lastIndex < raw.length) parts.push(raw.substring(lastIndex));
  return parts.length > 0 ? parts : raw;
}

// ================= BLOCK RENDERER =================

export default function Markdown({ content, taskStates, onTaskToggle }: MarkdownProps) {
  const lines = (content || '').split('\n');
  const elements: React.ReactNode[] = [];
  let inTable = false;
  let tableRows: string[][] = [];
  let inCode = false;
  let codeLines: string[] = [];
  let listBuffer: { ordered: boolean; items: React.ReactNode[] } | null = null;
  let taskCounter = -1;

  const flushList = (key: string) => {
    if (!listBuffer) return;
    const items = listBuffer.items;
    elements.push(
      listBuffer.ordered ? (
        <ol key={key} className="my-2 ml-5 list-decimal space-y-1">{items}</ol>
      ) : (
        <ul key={key} className="my-2 ml-5 list-disc space-y-1">{items}</ul>
      )
    );
    listBuffer = null;
  };

  const flushTable = (key: string) => {
    if (!inTable || tableRows.length === 0) { inTable = false; return; }
    const header = tableRows[0];
    const body = tableRows.slice(1);
    elements.push(
      <div key={key} className="overflow-x-auto my-4 rounded-lg border border-neutral-800 dark:border-neutral-800 light:border-neutral-200">
        <table className="w-full text-left text-xs">
          <thead className="bg-neutral-900 dark:bg-neutral-900 light:bg-neutral-100 text-neutral-400 dark:text-neutral-400 light:text-neutral-700 uppercase font-mono">
            <tr>
              {header.map((th, hIdx) => (
                <th key={hIdx} className="p-2.5 border-b border-neutral-800 dark:border-neutral-800 light:border-neutral-200 font-medium whitespace-nowrap">{parseInline(th, `th-${key}-${hIdx}`)}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800 dark:divide-neutral-800 light:divide-neutral-200 bg-neutral-950/40 dark:bg-neutral-950/40 light:bg-white">
            {body.map((row, rIdx) => (
              <tr key={rIdx} className="hover:bg-neutral-900/40 dark:hover:bg-neutral-900/40 light:hover:bg-neutral-50">
                {row.map((td, dIdx) => (
                  <td key={dIdx} className="p-2.5 text-neutral-300 dark:text-neutral-300 light:text-neutral-800">{parseInline(td, `td-${key}-${rIdx}-${dIdx}`)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableRows = [];
    inTable = false;
  };

  lines.forEach((line, idx) => {
    // ---- Код-блоки ----
    if (line.startsWith('```')) {
      flushList(`ul-${idx}`);
      if (inCode) {
        inCode = false;
        elements.push(
          <pre key={`code-${idx}`} className="p-3.5 my-3 rounded-lg bg-neutral-900 dark:bg-neutral-900 light:bg-neutral-100 border border-neutral-800 dark:border-neutral-800 light:border-neutral-200 font-mono text-xs text-neutral-200 dark:text-neutral-200 light:text-neutral-900 overflow-x-auto">
            <code>{codeLines.join('\n')}</code>
          </pre>
        );
        codeLines = [];
      } else {
        inCode = true;
      }
      return;
    }
    if (inCode) { codeLines.push(line); return; }

    // ---- Таблицы ----
    if (line.startsWith('|')) {
      flushList(`ul-${idx}`);
      inTable = true;
      const cells = line.split('|').slice(1, -1).map(c => c.trim());
      if (!cells.every(c => c.includes('---') || c.includes(':--'))) {
        tableRows.push(cells);
      }
      return;
    } else if (inTable) {
      flushTable(`tbl-${idx}`);
    }

    // ---- Изображения / GIF: ![alt](url) ----
    const imgMatch = line.trim().match(/^!\[(.*?)\]\((.*?)\)$/);
    if (imgMatch) {
      flushList(`ul-${idx}`);
      const url = sanitizeUrl(imgMatch[2]);
      if (isDirectVideo(url)) {
        // Загруженное видео, вставленное как изображение — показываем плеер
        elements.push(
          <div key={`vid-${idx}`} className="my-3 rounded-lg overflow-hidden border border-neutral-800 dark:border-neutral-800 light:border-neutral-200 bg-black">
            <video src={url} controls playsInline preload="metadata" className="w-full max-h-[420px]" />
          </div>
        );
      } else {
        elements.push(
          <div key={`img-${idx}`} className="my-3 rounded-lg overflow-hidden border border-neutral-800 dark:border-neutral-800 light:border-neutral-200">
            <img src={url} alt={imgMatch[1]} loading="lazy" className="w-full max-h-96 object-contain bg-neutral-950 dark:bg-neutral-950 light:bg-neutral-100" />
            {imgMatch[1] && (
              <div className="p-2 text-[11px] text-neutral-400 dark:text-neutral-400 light:text-neutral-600 font-mono text-center bg-neutral-950 dark:bg-neutral-950 light:bg-neutral-100 border-t border-neutral-800 dark:border-neutral-800 light:border-neutral-200">
                {imgMatch[1]}
              </div>
            )}
          </div>
        );
      }
      return;
    }

    // ---- Видео: [video: url](подпись) ----
    if (line.startsWith('[video: ') && line.includes('](')) {
      const match = line.match(/\[video:\s*(.*?)\]\((.*?)\)/);
      if (match) {
        flushList(`ul-${idx}`);
        const url = sanitizeUrl(match[1]);
        const caption = match[2];
        if (isDirectVideo(url)) {
          elements.push(
            <div key={`vid-${idx}`} className="my-3 rounded-lg overflow-hidden border border-neutral-800 dark:border-neutral-800 light:border-neutral-200 bg-black">
              <video src={url} controls playsInline preload="metadata" className="w-full max-h-[420px]" />
              {caption && (
                <div className="p-2 text-[11px] text-neutral-400 font-mono text-center bg-neutral-950 border-t border-neutral-800">
                  {caption}
                </div>
              )}
            </div>
          );
        } else {
          elements.push(
            <div key={`vid-${idx}`} className="my-3 p-3.5 rounded-lg border border-neutral-800 dark:border-neutral-800 light:border-neutral-200 bg-neutral-900 dark:bg-neutral-900 light:bg-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-medium text-neutral-200 dark:text-neutral-200 light:text-neutral-900 min-w-0">
                <Video className="w-4 h-4 text-neutral-400 shrink-0" />
                <span className="truncate">{caption || 'Видеоинструкция'}</span>
              </div>
              <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs underline flex items-center gap-1 font-mono text-neutral-100 dark:text-neutral-100 light:text-black shrink-0">
                Смотреть видео <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          );
        }
        return;
      }
    }

    // ---- Чек-листы: - [ ] / - [x] ----
    if (line.startsWith('- [x] ') || line.startsWith('- [ ] ') || line.startsWith('- [X] ')) {
      flushList(`ul-${idx}`);
      taskCounter += 1;
      const tIdx = taskCounter;
      const baseChecked = /^- \[[xX]\] /.test(line);
      const isChecked = taskStates && tIdx in taskStates ? taskStates[tIdx] : baseChecked;
      const label = line.replace(/^- \[[ xX]\] /, '');
      const interactive = !!onTaskToggle;
      elements.push(
        <button
          key={`task-${idx}`}
          type="button"
          disabled={!interactive}
          onClick={() => onTaskToggle && onTaskToggle(tIdx, !isChecked)}
          className={`w-full text-left flex items-start gap-2.5 my-1 px-2 py-1.5 -mx-2 rounded-lg text-xs transition-colors group ${
            interactive ? 'cursor-pointer hover:bg-neutral-900/60 dark:hover:bg-neutral-900/60 light:hover:bg-neutral-100' : 'cursor-default'
          }`}
        >
          <span
            className={`mt-[1px] shrink-0 w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
              isChecked
                ? 'bg-white dark:bg-white light:bg-black border-white dark:border-white light:border-black text-black dark:text-black light:text-white'
                : `border-neutral-600 dark:border-neutral-600 light:border-neutral-400 text-transparent ${interactive ? 'group-hover:border-neutral-300 dark:group-hover:border-neutral-300 light:group-hover:border-neutral-600' : ''}`
            }`}
          >
            <Check className="w-3 h-3" strokeWidth={3} />
          </span>
          <span className={`leading-relaxed ${isChecked ? 'line-through text-neutral-500' : 'text-neutral-300 dark:text-neutral-300 light:text-neutral-800'}`}>
            {parseInline(label, `task-${idx}`)}
          </span>
        </button>
      );
      return;
    }

    // ---- Заголовки ----
    if (line.startsWith('## ')) {
      flushList(`ul-${idx}`);
      elements.push(
        <h2 key={idx} className="text-base font-semibold text-neutral-100 dark:text-neutral-100 light:text-neutral-900 mt-5 mb-2 pb-1.5 border-b border-neutral-800 dark:border-neutral-800 light:border-neutral-200">
          {parseInline(line.replace('## ', ''), `h2-${idx}`)}
        </h2>
      );
      return;
    }
    if (line.startsWith('### ')) {
      flushList(`ul-${idx}`);
      elements.push(
        <h3 key={idx} className="text-xs font-semibold text-neutral-200 dark:text-neutral-200 light:text-neutral-800 uppercase tracking-wider mt-4 mb-2">
          {parseInline(line.replace('### ', ''), `h3-${idx}`)}
        </h3>
      );
      return;
    }
    if (line.startsWith('# ')) {
      flushList(`ul-${idx}`);
      elements.push(
        <h1 key={idx} className="text-lg font-bold text-neutral-100 dark:text-neutral-100 light:text-neutral-900 mt-5 mb-2">
          {parseInline(line.replace('# ', ''), `h1-${idx}`)}
        </h1>
      );
      return;
    }

    // ---- Цитаты ----
    if (line.startsWith('> ')) {
      flushList(`ul-${idx}`);
      elements.push(
        <div key={idx} className="my-3 p-3 rounded-lg bg-neutral-900 dark:bg-neutral-900 light:bg-neutral-100 border-l-2 border-neutral-400 dark:border-neutral-400 light:border-black text-neutral-300 dark:text-neutral-300 light:text-neutral-800 text-xs leading-relaxed">
          {parseInline(line.replace('> ', ''), `q-${idx}`)}
        </div>
      );
      return;
    }

    // ---- Разделитель ----
    if (line.trim() === '---') {
      flushList(`ul-${idx}`);
      elements.push(<hr key={idx} className="my-5 border-neutral-800 dark:border-neutral-800 light:border-neutral-200" />);
      return;
    }

    // ---- Списки ----
    if (line.startsWith('- ') || line.startsWith('* ')) {
      if (!listBuffer || listBuffer.ordered) { flushList(`ul-${idx}`); listBuffer = { ordered: false, items: [] }; }
      listBuffer.items.push(
        <li key={idx} className="text-xs text-neutral-300 dark:text-neutral-300 light:text-neutral-800 leading-relaxed">
          {parseInline(line.substring(2), `li-${idx}`)}
        </li>
      );
      return;
    }
    if (/^\d+\.\s/.test(line)) {
      if (!listBuffer || !listBuffer.ordered) { flushList(`ol-${idx}`); listBuffer = { ordered: true, items: [] }; }
      listBuffer.items.push(
        <li key={idx} className="text-xs text-neutral-300 dark:text-neutral-300 light:text-neutral-800 leading-relaxed">
          {parseInline(line.replace(/^\d+\.\s/, ''), `oli-${idx}`)}
        </li>
      );
      return;
    }

    // ---- Параграфы ----
    flushList(`ul-${idx}`);
    if (line.trim().length > 0) {
      elements.push(
        <p key={idx} className="text-xs text-neutral-300 dark:text-neutral-300 light:text-neutral-800 mb-2.5 leading-relaxed break-words">
          {parseInline(line, `p-${idx}`)}
        </p>
      );
    }
  });

  flushList('ul-final');
  flushTable('tbl-final');

  return <div className="markdown-body">{elements}</div>;
}
