'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import { Space, Article } from '@/lib/types';
import Markdown from '@/components/Markdown';
import { safeGetItem, safeSetItem, safeRemoveItem } from '@/lib/storage';
import { 
  Save, ArrowLeft, Eye, Heading1, Heading2, Heading3,
  Bold, Italic, Strikethrough, Underline, Code, List, ListOrdered, CheckSquare,
  Info, AlertTriangle, AlertCircle, Sparkles, Table, Minus, Pin, Tag,
  Link as LinkIcon, Image as ImageIcon, Video, Smile, X, ExternalLink,
  Upload, Loader2, RotateCcw
} from 'lucide-react';

interface ArticleEditorProps {
  initialArticle?: Partial<Article>;
  isNew?: boolean;
}

export default function ArticleEditor({ initialArticle, isNew = false }: ArticleEditorProps) {
  const router = useRouter();
  const toast = useToast();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const [spaces, setSpaces] = useState<Space[]>([]);
  const [spaceId, setSpaceId] = useState(initialArticle?.space_id || '');
  const [title, setTitle] = useState(initialArticle?.title || '');
  const [content, setContent] = useState(initialArticle?.content || '');
  const [excerpt, setExcerpt] = useState(initialArticle?.excerpt || '');
  const [tagsInput, setTagsInput] = useState((initialArticle?.tags || []).join(', '));
  const [isPinned, setIsPinned] = useState(Boolean(initialArticle?.is_pinned));
  const [previewMode, setPreviewMode] = useState<'split' | 'edit' | 'preview'>('split');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ===== Автосохранение черновика (localStorage) =====
  const draftKey = `article-draft:${isNew ? 'new' : (initialArticle?.id || 'new')}`;
  const [draftBanner, setDraftBanner] = useState<{ ts: number; data: any } | null>(null);
  const draftLoadedRef = useRef(false);

  // На мобильных по умолчанию показываем только редактор (сплит слишком тесный)
  useEffect(() => {
    try {
      if (window.innerWidth < 768) setPreviewMode('edit');
    } catch {}
  }, []);

  // При открытии — проверяем, есть ли несохраненный черновик
  useEffect(() => {
    if (draftLoadedRef.current) return;
    draftLoadedRef.current = true;
    try {
      const raw = safeGetItem(draftKey);
      if (!raw) return;
      const draft = JSON.parse(raw);
      const differs = (draft.content || '') !== (initialArticle?.content || '')
        || (draft.title || '') !== (initialArticle?.title || '');
      if (differs && (draft.content || draft.title)) {
        setDraftBanner({ ts: draft.ts || Date.now(), data: draft });
      } else {
        safeRemoveItem(draftKey);
      }
    } catch {}
  }, [draftKey]);

  // Дебаунс-сохранение черновика при любом изменении полей
  useEffect(() => {
    if (!draftLoadedRef.current) return;
    const timer = setTimeout(() => {
      try {
        const differs = content !== (initialArticle?.content || '') || title !== (initialArticle?.title || '');
        if (!differs) return;
        safeSetItem(draftKey, JSON.stringify({
          ts: Date.now(),
          space_id: spaceId, title, content, excerpt,
          tags: tagsInput, is_pinned: isPinned,
        }));
      } catch {}
    }, 800);
    return () => clearTimeout(timer);
  }, [title, content, excerpt, tagsInput, spaceId, isPinned, draftKey]);

  const restoreDraft = () => {
    if (!draftBanner) return;
    const d = draftBanner.data;
    if (d.space_id) setSpaceId(d.space_id);
    setTitle(d.title || '');
    setContent(d.content || '');
    setExcerpt(d.excerpt || '');
    setTagsInput(d.tags || '');
    setIsPinned(Boolean(d.is_pinned));
    setDraftBanner(null);
    toast.success('Черновик восстановлен');
  };

  const discardDraft = () => {
    safeRemoveItem(draftKey);
    setDraftBanner(null);
  };

  // Modals for insertion
  const [modalType, setModalType] = useState<'link' | 'image' | 'video' | null>(null);
  const [insertTextVal, setInsertTextVal] = useState('');
  const [insertUrlVal, setInsertUrlVal] = useState('');

  // Emoji palette
  const [showEmojiBar, setShowEmojiBar] = useState(false);
  const emojis = ['⚡', '🔋', '🚗', '🔌', '📋', '⚠️', '🚨', '💡', '📌', '🔧', '💬', '🚀', '💻', '📊', '🛡️', '✅', '❌', '⏱️', '📦', '🏷️', '🔑', '🌍', '📡', '📱'];

  useEffect(() => {
    fetch('/api/spaces')
      .then(r => r.json())
      .then(d => {
        setSpaces(d.spaces || []);
        if (!spaceId && d.spaces?.length > 0) {
          setSpaceId(d.spaces[0].id);
        }
      });
  }, [spaceId]);

  const insertSnippet = (before: string, after: string = '', defaultText: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end) || defaultText;
    const replacement = `${before}${selectedText}${after}`;

    const newContent = content.substring(0, start) + replacement + content.substring(end);
    setContent(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
    }, 50);
  };

  // ===== Загрузка файлов (картинки / GIF / видео) =====
  const insertBlockAtCursor = useCallback((snippet: string) => {
    const textarea = textareaRef.current;
    setContent(prev => {
      const start = textarea ? textarea.selectionStart : prev.length;
      const end = textarea ? textarea.selectionEnd : prev.length;
      return prev.substring(0, start) + snippet + prev.substring(end);
    });
  }, []);

  const uploadFile = useCallback(async (file: File) => {
    const isMedia = file.type.startsWith('image/') || file.type.startsWith('video/');
    if (!isMedia) {
      toast.error('Можно загружать только изображения, GIF и видео');
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/uploads', { method: 'POST', body: fd });
      const data = await res.json();
      if (res.ok) {
        const baseName = (file.name || '').replace(/\.[^.]+$/, '');
        const snippet = data.kind === 'video'
          ? `\n[video: ${data.url}](${baseName || 'Видеоматериал'})\n`
          : `\n![${baseName || 'Изображение'}](${data.url})\n`;
        insertBlockAtCursor(snippet);
        toast.success('Файл загружен и вставлен в статью');
      } else {
        toast.error('Ошибка загрузки', data.error);
      }
    } catch {
      toast.error('Сбой при загрузке файла');
    } finally {
      setUploading(false);
    }
  }, [insertBlockAtCursor, toast]);

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) uploadFile(f);
    e.target.value = '';
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const files = Array.from(e.clipboardData?.files || [])
      .filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'));
    if (files.length > 0) {
      e.preventDefault();
      files.forEach(uploadFile);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLTextAreaElement>) => {
    const files = Array.from(e.dataTransfer?.files || [])
      .filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'));
    if (files.length > 0) {
      e.preventDefault();
      files.forEach(uploadFile);
    }
  };

  const handleOpenInsertModal = (type: 'link' | 'image' | 'video') => {
    const textarea = textareaRef.current;
    const selectedText = textarea ? content.substring(textarea.selectionStart, textarea.selectionEnd) : '';
    setInsertTextVal(selectedText);
    setInsertUrlVal('');
    setModalType(type);
  };

  const handleConfirmInsert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!insertUrlVal) return;

    if (modalType === 'link') {
      const label = insertTextVal.trim() || insertUrlVal;
      insertSnippet(`[${label}](`, `)`, insertUrlVal);
    } else if (modalType === 'image') {
      const alt = insertTextVal.trim() || 'Изображение';
      insertSnippet(`![${alt}](`, `)\n`, insertUrlVal);
    } else if (modalType === 'video') {
      const caption = insertTextVal.trim() || 'Видеоматериал';
      insertSnippet(`[video: ${insertUrlVal}](${caption})\n`, '');
    }

    setModalType(null);
    setInsertTextVal('');
    setInsertUrlVal('');
  };

  const insertEmoji = (emoji: string) => {
    insertSnippet(emoji, '');
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error('Заполните заголовок и содержание статьи');
      return;
    }

    if (!spaceId) {
      toast.error('Выберите пространство для статьи');
      return;
    }

    setSaving(true);
    const tags = tagsInput.split(',').map(t => t.trim().replace(/^#/, '')).filter(Boolean);

    try {
      const url = isNew ? '/api/articles' : `/api/articles/${initialArticle?.id}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          space_id: spaceId,
          title: title.trim(),
          content: content.trim(),
          excerpt: excerpt.trim() || undefined,
          tags,
          is_pinned: isPinned,
        })
      });

      const data = await res.json();
      if (res.ok) {
        safeRemoveItem(draftKey);
        toast.success(isNew ? 'Статья создана' : 'Статья обновлена');
        router.push(`/app/knowledge-base?article=${data.article?.id || initialArticle?.id}`);
      } else {
        toast.error('Ошибка сохранения', data.error);
      }
    } catch (err: any) {
      toast.error('Сбой сервера');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800 dark:border-neutral-800 light:border-neutral-200">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-1.5 rounded-lg bg-neutral-900 dark:bg-neutral-900 light:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-neutral-800 light:hover:bg-neutral-200 border border-neutral-700 dark:border-neutral-700 light:border-neutral-300 text-neutral-300 dark:text-neutral-300 light:text-neutral-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-base font-semibold text-neutral-100 dark:text-neutral-100 light:text-neutral-900">
            {isNew ? 'Создание статьи' : 'Редактирование статьи'}
          </h1>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-neutral-900 dark:bg-neutral-900 light:bg-neutral-100 p-0.5 rounded-lg border border-neutral-800 dark:border-neutral-800 light:border-neutral-300 text-xs">
            <button
              onClick={() => setPreviewMode('edit')}
              className={`px-2.5 py-1 rounded transition-colors ${previewMode === 'edit' ? 'bg-neutral-800 dark:bg-neutral-800 light:bg-neutral-300 text-white dark:text-white light:text-black font-medium' : 'text-neutral-400 dark:text-neutral-400 light:text-neutral-600'}`}
            >
              Код
            </button>
            <button
              onClick={() => setPreviewMode('split')}
              className={`px-2.5 py-1 rounded transition-colors ${previewMode === 'split' ? 'bg-neutral-800 dark:bg-neutral-800 light:bg-neutral-300 text-white dark:text-white light:text-black font-medium' : 'text-neutral-400 dark:text-neutral-400 light:text-neutral-600'}`}
            >
              Сплит
            </button>
            <button
              onClick={() => setPreviewMode('preview')}
              className={`px-2.5 py-1 rounded transition-colors ${previewMode === 'preview' ? 'bg-neutral-800 dark:bg-neutral-800 light:bg-neutral-300 text-white dark:text-white light:text-black font-medium' : 'text-neutral-400 dark:text-neutral-400 light:text-neutral-600'}`}
            >
              Превью
            </button>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-black dark:text-black light:text-white bg-white dark:bg-white light:bg-black hover:bg-neutral-200 transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Сохранение...' : 'Сохранить'}</span>
          </button>
        </div>
      </div>

      {/* Draft restore banner */}
      {draftBanner && (
        <div className="glass-panel rounded-xl p-3 border border-amber-700/40 bg-amber-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 animate-in fade-in duration-150">
          <div className="flex items-center gap-2 text-xs text-amber-200/90">
            <RotateCcw className="w-3.5 h-3.5 shrink-0" />
            <span>
              Найден несохраненный черновик от {new Date(draftBanner.ts).toLocaleString('ru-RU')}. Восстановить?
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={restoreDraft}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/90 hover:bg-amber-400 text-black transition-colors"
            >
              Восстановить
            </button>
            <button
              onClick={discardDraft}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-900 dark:bg-neutral-900 light:bg-neutral-100 hover:bg-neutral-800 border border-neutral-700 dark:border-neutral-700 light:border-neutral-300 text-neutral-300 dark:text-neutral-300 light:text-neutral-700 transition-colors"
            >
              Удалить черновик
            </button>
          </div>
        </div>
      )}

      {/* Meta Controls */}
      <div className="glass-panel rounded-xl p-4 border border-neutral-800 dark:border-neutral-800 light:border-neutral-200 shadow-subtle space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-neutral-300 dark:text-neutral-300 light:text-neutral-700 mb-1">
              Заголовок статьи *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Название статьи"
              className="glass-input w-full px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-100 dark:text-neutral-100 light:text-neutral-900 placeholder-neutral-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 dark:text-neutral-300 light:text-neutral-700 mb-1">
              Пространство *
            </label>
            <select
              value={spaceId}
              onChange={(e) => setSpaceId(e.target.value)}
              className="glass-input w-full px-3 py-1.5 rounded-lg text-xs text-neutral-100 dark:text-neutral-100 light:text-neutral-900 outline-none bg-neutral-900 dark:bg-neutral-900 light:bg-white"
            >
              {spaces.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-neutral-300 dark:text-neutral-300 light:text-neutral-700 mb-1">
              Теги (через запятую)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="регламент, безопасность, зарядка"
              className="glass-input w-full px-3 py-1.5 rounded-lg text-xs text-neutral-100 dark:text-neutral-100 light:text-neutral-900 placeholder-neutral-500 outline-none"
            />
          </div>

          <div className="flex items-center pt-4">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-300 dark:text-neutral-300 light:text-neutral-700">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="rounded text-black focus:ring-0 bg-neutral-800 border-neutral-700 w-4 h-4"
              />
              <span>Закрепить статью вверху</span>
            </label>
          </div>
        </div>
      </div>

      {/* Editor Main */}
      <div className="glass-panel rounded-xl border border-neutral-800 dark:border-neutral-800 light:border-neutral-200 overflow-hidden flex flex-col">
        {/* Rich Toolbar */}
        <div className="p-2 bg-neutral-900 dark:bg-neutral-900 light:bg-neutral-100 border-b border-neutral-800 dark:border-neutral-800 light:border-neutral-200 flex flex-wrap items-center gap-1 text-neutral-300 dark:text-neutral-300 light:text-neutral-700">
          <button
            type="button"
            onClick={() => insertSnippet('## ', '\n', 'Заголовок раздела')}
            className="p-1 hover:bg-neutral-800 dark:hover:bg-neutral-800 light:hover:bg-neutral-200 rounded text-xs font-bold"
            title="Заголовок H2"
          >
            H2
          </button>
          <button
            type="button"
            onClick={() => insertSnippet('### ', '\n', 'Подзаголовок')}
            className="p-1 hover:bg-neutral-800 dark:hover:bg-neutral-800 light:hover:bg-neutral-200 rounded text-xs font-semibold"
            title="Подзаголовок H3"
          >
            H3
          </button>
          <div className="w-[1px] h-3.5 bg-neutral-800 dark:bg-neutral-800 light:bg-neutral-300 mx-1" />
          
          <button
            type="button"
            onClick={() => insertSnippet('**', '**', 'жирный текст')}
            className="p-1 hover:bg-neutral-800 dark:hover:bg-neutral-800 light:hover:bg-neutral-200 rounded"
            title="Жирный"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertSnippet('*', '*', 'курсив')}
            className="p-1 hover:bg-neutral-800 dark:hover:bg-neutral-800 light:hover:bg-neutral-200 rounded"
            title="Курсив"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertSnippet('~~', '~~', 'зачеркнутый текст')}
            className="p-1 hover:bg-neutral-800 dark:hover:bg-neutral-800 light:hover:bg-neutral-200 rounded"
            title="Зачеркнутый"
          >
            <Strikethrough className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertSnippet('<u>', '</u>', 'подчеркнутый текст')}
            className="p-1 hover:bg-neutral-800 dark:hover:bg-neutral-800 light:hover:bg-neutral-200 rounded"
            title="Подчеркнутый"
          >
            <Underline className="w-3.5 h-3.5" />
          </button>

          <div className="w-[1px] h-3.5 bg-neutral-800 dark:bg-neutral-800 light:bg-neutral-300 mx-1" />

          {/* Media & Links */}
          <button
            type="button"
            onClick={() => handleOpenInsertModal('link')}
            className="p-1 hover:bg-neutral-800 dark:hover:bg-neutral-800 light:hover:bg-neutral-200 rounded flex items-center gap-1 text-xs"
            title="Вставить ссылку в текст"
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px]">Ссылка</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenInsertModal('image')}
            className="p-1 hover:bg-neutral-800 dark:hover:bg-neutral-800 light:hover:bg-neutral-200 rounded flex items-center gap-1 text-xs"
            title="Вставить фото / GIF"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px]">Фото/GIF</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenInsertModal('video')}
            className="p-1 hover:bg-neutral-800 dark:hover:bg-neutral-800 light:hover:bg-neutral-200 rounded flex items-center gap-1 text-xs"
            title="Вставить видео"
          >
            <Video className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px]">Видео</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="p-1 hover:bg-neutral-800 dark:hover:bg-neutral-800 light:hover:bg-neutral-200 rounded flex items-center gap-1 text-xs disabled:opacity-50"
            title="Загрузить файл с устройства (фото, GIF, видео). Также можно вставить из буфера обмена (Ctrl+V) или перетащить в текст"
          >
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline text-[11px]">{uploading ? 'Загрузка...' : 'Загрузить'}</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,video/mp4,video/webm,video/quicktime,video/ogg"
            onChange={handleFilePick}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => setShowEmojiBar(!showEmojiBar)}
            className={`p-1 hover:bg-neutral-800 dark:hover:bg-neutral-800 light:hover:bg-neutral-200 rounded flex items-center gap-1 text-xs ${showEmojiBar ? 'bg-neutral-800 dark:bg-neutral-800 light:bg-neutral-300' : ''}`}
            title="Вставить эмодзи"
          >
            <Smile className="w-3.5 h-3.5" />
          </button>

          <div className="w-[1px] h-3.5 bg-neutral-800 dark:bg-neutral-800 light:bg-neutral-300 mx-1" />

          <button
            type="button"
            onClick={() => insertSnippet('- ', '\n', 'Пункт списка')}
            className="p-1 hover:bg-neutral-800 rounded"
            title="Маркированный список"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertSnippet('1. ', '\n', 'Пункт списка')}
            className="p-1 hover:bg-neutral-800 rounded"
            title="Нумерованный список"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertSnippet('- [ ] ', '\n', 'Задача чек-листа')}
            className="p-1 hover:bg-neutral-800 rounded"
            title="Чек-лист"
          >
            <CheckSquare className="w-3.5 h-3.5" />
          </button>

          <div className="w-[1px] h-3.5 bg-neutral-800 dark:bg-neutral-800 light:bg-neutral-300 mx-1" />

          <button
            type="button"
            onClick={() => insertSnippet('> ⚠️ **Важно:** ', '\n', 'Текст предупреждения')}
            className="p-1 hover:bg-neutral-800 rounded"
            title="Предупреждение"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => insertSnippet('```json\n', '\n```\n', '{\n  "status": "active"\n}')}
            className="p-1 hover:bg-neutral-800 rounded"
            title="Блок кода"
          >
            <Code className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => insertSnippet('\n| Параметр | Значение |\n| :--- | :--- |\n| Показатель | Описание |\n')}
            className="p-1 hover:bg-neutral-800 rounded"
            title="Таблица"
          >
            <Table className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => insertSnippet('\n---\n')}
            className="p-1 hover:bg-neutral-800 rounded"
            title="Разделитель"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Emoji Quick Palette */}
        {showEmojiBar && (
          <div className="p-2 bg-neutral-950 dark:bg-neutral-950 light:bg-neutral-50 border-b border-neutral-800 dark:border-neutral-800 light:border-neutral-200 flex flex-wrap gap-1.5 animate-in fade-in duration-100">
            {emojis.map((em) => (
              <button
                key={em}
                type="button"
                onClick={() => insertEmoji(em)}
                className="w-7 h-7 rounded bg-neutral-900 dark:bg-neutral-900 light:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-800 light:hover:bg-neutral-200 border border-neutral-800 dark:border-neutral-800 light:border-neutral-300 flex items-center justify-center text-sm transition-transform active:scale-95"
              >
                {em}
              </button>
            ))}
          </div>
        )}

        <div className={`grid ${previewMode === 'split' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'} divide-y md:divide-y-0 md:divide-x divide-neutral-800 dark:divide-neutral-800 light:divide-neutral-200 min-h-[480px]`}>
          {(previewMode === 'split' || previewMode === 'edit') && (
            <div className="p-3 flex flex-col">
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onPaste={handlePaste}
                onDrop={handleDrop}
                placeholder="Содержание статьи в формате Markdown (поддерживаются ссылки [текст](url), фото ![alt](url), видео, таблицы и списки). Картинки можно вставлять из буфера обмена (Ctrl+V) или перетаскивать сюда..."
                className="w-full flex-1 bg-transparent text-xs font-mono text-neutral-100 dark:text-neutral-100 light:text-neutral-900 placeholder-neutral-600 outline-none resize-none leading-relaxed"
                rows={22}
              />
            </div>
          )}

          {(previewMode === 'split' || previewMode === 'preview') && (
            <div className="p-4 bg-neutral-950/40 dark:bg-neutral-950/40 light:bg-neutral-50 overflow-y-auto max-h-[600px]">
              <div className="text-[10px] font-mono uppercase text-neutral-500 mb-2">
                Предварительный просмотр
              </div>
              {content ? (
                <Markdown content={content} />
              ) : (
                <div className="text-neutral-500 text-xs italic">Текст предпросмотра появится здесь...</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* INSERT MODAL (Link / Image / Video) */}
      {modalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-100">
          <div className="glass-panel max-w-md w-full p-5 rounded-xl border border-neutral-800 dark:border-neutral-800 light:border-neutral-200 shadow-elevated space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800 dark:border-neutral-800 light:border-neutral-200">
              <h3 className="text-sm font-semibold text-neutral-100 dark:text-neutral-100 light:text-neutral-900">
                {modalType === 'link' && 'Вставить кликабельную ссылку в текст'}
                {modalType === 'image' && 'Вставить фото или GIF'}
                {modalType === 'video' && 'Вставить ссылку на видео'}
              </h3>
              <button onClick={() => setModalType(null)} className="text-neutral-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmInsert} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-neutral-300 dark:text-neutral-300 light:text-neutral-700 mb-1">
                  {modalType === 'link' ? 'Отображаемый текст ссылки' : 'Описание / Подпись'}
                </label>
                <input
                  type="text"
                  value={insertTextVal}
                  onChange={(e) => setInsertTextVal(e.target.value)}
                  placeholder={modalType === 'link' ? 'Например: Инструкция в Telegram' : 'Описание'}
                  className="glass-input w-full px-3 py-1.5 rounded-lg text-xs text-neutral-100 dark:text-neutral-100 light:text-neutral-900 placeholder-neutral-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 dark:text-neutral-300 light:text-neutral-700 mb-1">
                  URL адрес *
                </label>
                <input
                  type="url"
                  value={insertUrlVal}
                  onChange={(e) => setInsertUrlVal(e.target.value)}
                  placeholder="https://..."
                  required
                  autoFocus
                  className="glass-input w-full px-3 py-1.5 rounded-lg text-xs text-neutral-100 dark:text-neutral-100 light:text-neutral-900 placeholder-neutral-500 outline-none font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-3 py-1.5 rounded-lg text-xs text-neutral-400 hover:text-white"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-white light:bg-black text-black dark:text-black light:text-white hover:bg-neutral-200 transition-colors"
                >
                  Вставить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
