'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/Toast';
import { Space, Article } from '@/lib/types';
import { isAdmin } from '@/lib/auth-helpers';
import Markdown from '@/components/Markdown';
import { safeGetItem, safeSetItem } from '@/lib/storage';
import { 
  BookOpen, Plus, Search, Tag, 
  Edit3, Trash2, Pin, Download, Printer, 
  FileText, X, Layers, ExternalLink, Video,
  ArrowLeft, ChevronLeft, ChevronRight
} from 'lucide-react';

export default function KnowledgeBasePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const toast = useToast();

  const [spaces, setSpaces] = useState<Space[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>('all');
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // New Space modal
  const [showNewSpaceModal, setShowNewSpaceModal] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState('');
  const [newSpaceDesc, setNewSpaceDesc] = useState('');

  const canEdit = isAdmin(user);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resSpaces, resArticles] = await Promise.all([
        fetch('/api/spaces').then(r => r.json()),
        fetch('/api/articles').then(r => r.json()),
      ]);

      setSpaces(resSpaces.spaces || []);
      const arts: Article[] = resArticles.articles || [];
      setArticles(arts);

      const paramSpace = searchParams.get('space');
      const paramArticle = searchParams.get('article');
      const paramTag = searchParams.get('tag');

      if (paramSpace) setSelectedSpaceId(paramSpace);
      if (paramTag) setSelectedTag(paramTag);
      if (paramArticle) {
        setSelectedArticleId(paramArticle);
      }
    } catch (err) {
      toast.error('Ошибка загрузки базы знаний');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const paramArticle = searchParams.get('article');
    if (paramArticle) {
      setSelectedArticleId(paramArticle);
    }
  }, [articles, searchParams]);

  const filteredArticles = articles.filter(a => {
    const matchesSpace = selectedSpaceId === 'all' || a.space_id === selectedSpaceId;
    const matchesTag = !selectedTag || a.tags.includes(selectedTag);
    const matchesQuery = !searchQuery || 
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      a.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSpace && matchesTag && matchesQuery;
  });

  const currentArticle = selectedArticleId
    ? articles.find(a => a.id === selectedArticleId || a.slug === selectedArticleId)
    : undefined;
  const currentSpace = spaces.find(s => s.id === currentArticle?.space_id);
  const allTags = Array.from(new Set(articles.flatMap(a => a.tags || [])));
  const readingMode = !!currentArticle;

  // Соседние статьи в том же пространстве (для навигации внизу статьи)
  const spaceArticles = currentArticle
    ? articles.filter(a => a.space_id === currentArticle.space_id)
    : [];
  const currentIdx = currentArticle ? spaceArticles.findIndex(a => a.id === currentArticle.id) : -1;
  const prevArticle = currentIdx > 0 ? spaceArticles[currentIdx - 1] : null;
  const nextArticle = currentIdx >= 0 && currentIdx < spaceArticles.length - 1 ? spaceArticles[currentIdx + 1] : null;

  const openArticle = (id: string) => {
    setSelectedArticleId(id);
    try { window.history.replaceState(null, '', `/app/knowledge-base?article=${id}`); } catch {}
    try { window.scrollTo({ top: 0 }); } catch {}
  };

  const closeArticle = () => {
    setSelectedArticleId(null);
    try { window.history.replaceState(null, '', '/app/knowledge-base'); } catch {}
  };

  // ===== Персональные отметки чек-боксов в статье (localStorage) =====
  const [taskStates, setTaskStates] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (!currentArticle) { setTaskStates({}); return; }
    try {
      const saved = safeGetItem(`kb-tasks:${currentArticle.id}`);
      setTaskStates(saved ? JSON.parse(saved) : {});
    } catch { setTaskStates({}); }
  }, [currentArticle?.id]);

  const handleTaskToggle = (taskIndex: number, checked: boolean) => {
    if (!currentArticle) return;
    setTaskStates(prev => {
      const next = { ...prev, [taskIndex]: checked };
      safeSetItem(`kb-tasks:${currentArticle.id}`, JSON.stringify(next));
      return next;
    });
  };

  const handleDeleteArticle = async (id: string, title: string) => {
    if (!confirm(`Удалить статью «${title}»?`)) return;

    try {
      const res = await fetch(`/api/articles/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Статья удалена');
        setArticles(prev => prev.filter(a => a.id !== id));
        if (selectedArticleId === id) {
          const remaining = articles.filter(a => a.id !== id);
          setSelectedArticleId(remaining[0]?.id || null);
        }
      } else {
        const data = await res.json();
        toast.error('Ошибка удаления', data.error);
      }
    } catch (err) {
      toast.error('Сбой сервера');
    }
  };

  const handleCreateSpace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSpaceName) return;

    try {
      const res = await fetch('/api/spaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSpaceName,
          description: newSpaceDesc,
        })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Пространство создано');
        setSpaces(prev => [...prev, data.space]);
        setShowNewSpaceModal(false);
        setNewSpaceName('');
        setNewSpaceDesc('');
        setSelectedSpaceId(data.space.id);
      } else {
        toast.error('Ошибка', data.error);
      }
    } catch (err) {
      toast.error('Сбой сервера');
    }
  };

  const handleDeleteSpace = async (sp: Space) => {
    const count = articles.filter(a => a.space_id === sp.id).length;
    const confirmMsg = count > 0
      ? `Удалить пространство «${sp.name}» ВМЕСТЕ с ${count} статьями? Действие необратимо.`
      : `Удалить пустое пространство «${sp.name}»?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/spaces/${sp.id}?force=${count > 0 ? '1' : '0'}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        toast.success('Пространство удалено', count > 0 ? `Вместе со статьями: ${data.deleted_articles}` : undefined);
        setSpaces(prev => prev.filter(s => s.id !== sp.id));
        setArticles(prev => prev.filter(a => a.space_id !== sp.id));
        if (selectedSpaceId === sp.id) setSelectedSpaceId('all');
      } else {
        toast.error('Ошибка удаления', data.error);
      }
    } catch (err) {
      toast.error('Сбой сервера');
    }
  };

  const handleExportMarkdown = (art: Article) => {
    const blob = new Blob([art.content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${art.slug || 'article'}.md`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Файл сохранен', `${art.title}.md`);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {!readingMode && (<>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800 dark:border-neutral-800 light:border-neutral-200">
        <div>
          <h1 className="text-lg font-semibold text-neutral-100 dark:text-neutral-100 light:text-neutral-900 tracking-tight">
            База знаний
          </h1>
          <p className="text-xs text-neutral-400 dark:text-neutral-400 light:text-neutral-600 mt-0.5">
            Регламенты, инструкции, фото/видео материалы и техническая документация
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canEdit && (
            <>
              <button
                onClick={() => setShowNewSpaceModal(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-900 dark:bg-neutral-900 light:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-neutral-800 light:hover:bg-neutral-200 border border-neutral-700 dark:border-neutral-700 light:border-neutral-300 text-neutral-200 dark:text-neutral-200 light:text-neutral-800 transition-colors flex items-center gap-1.5"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>+ Пространство</span>
              </button>

              <button
                onClick={() => router.push('/app/knowledge-base/new')}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-white light:bg-black text-black dark:text-black light:text-white hover:bg-neutral-200 transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Создать статью</span>
              </button>
            </>
          )}

          {!canEdit && (
            <div className="px-2.5 py-1 rounded border border-neutral-800 dark:border-neutral-800 light:border-neutral-300 text-[11px] font-mono text-neutral-400 dark:text-neutral-400 light:text-neutral-600">
              Read-Only
            </div>
          )}
        </div>
      </div>

      {/* Spaces Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setSelectedSpaceId('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
            selectedSpaceId === 'all'
              ? 'bg-neutral-800 dark:bg-neutral-800 light:bg-neutral-300 text-white dark:text-white light:text-black font-semibold'
              : 'bg-neutral-900/60 dark:bg-neutral-900/60 light:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-neutral-800 light:hover:bg-neutral-200 text-neutral-400 dark:text-neutral-400 light:text-neutral-600'
          }`}
        >
          Все ({articles.length})
        </button>

        {spaces.map(sp => {
          const isSelected = selectedSpaceId === sp.id;
          const count = articles.filter(a => a.space_id === sp.id).length;
          return (
            <div key={sp.id} className="flex items-center shrink-0">
              <button
                onClick={() => setSelectedSpaceId(sp.id)}
                className={`px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  isSelected && canEdit ? 'rounded-l-lg' : 'rounded-lg'
                } ${
                  isSelected
                    ? 'bg-neutral-800 dark:bg-neutral-800 light:bg-neutral-300 text-white dark:text-white light:text-black font-semibold'
                    : 'bg-neutral-900/60 dark:bg-neutral-900/60 light:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-neutral-800 light:hover:bg-neutral-200 text-neutral-400 dark:text-neutral-400 light:text-neutral-600'
                }`}
              >
                <span>{sp.name}</span>
                <span className="text-[10px] font-mono text-neutral-500">
                  {count}
                </span>
              </button>
              {isSelected && canEdit && (
                <button
                  onClick={() => handleDeleteSpace(sp)}
                  className="px-2 py-1.5 rounded-r-lg bg-neutral-800 dark:bg-neutral-800 light:bg-neutral-300 border-l border-neutral-700 dark:border-neutral-700 light:border-neutral-400 text-neutral-400 hover:text-white dark:hover:text-white light:hover:text-black transition-colors"
                  title="Удалить пространство"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* ===== BROWSE MODE: full-width article list ===== */}
      <div className="glass-panel rounded-xl p-3 border border-neutral-800 dark:border-neutral-800 light:border-neutral-200 shadow-subtle space-y-2.5">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Фильтр статей..."
            className="glass-input w-full pl-8 pr-3 py-1.5 rounded-lg text-xs text-neutral-200 dark:text-neutral-200 light:text-neutral-900 placeholder-neutral-500 outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded transition-colors ${
                  selectedTag === tag
                    ? 'bg-white dark:bg-white light:bg-black text-black dark:text-black light:text-white font-semibold'
                    : 'bg-neutral-850 dark:bg-neutral-850 light:bg-neutral-100 hover:bg-neutral-800 text-neutral-400 dark:text-neutral-400 light:text-neutral-600'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}

        {filteredArticles.length === 0 ? (
          <div className="text-center py-10 text-xs text-neutral-500">
            <BookOpen className="w-7 h-7 text-neutral-600 mx-auto mb-2" />
            Нет статей
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
            {filteredArticles.map(art => {
              const artSpace = spaces.find(s => s.id === art.space_id);
              return (
                <button
                  key={art.id}
                  onClick={() => openArticle(art.id)}
                  className="p-3 rounded-lg text-left transition-colors flex items-start gap-2.5 bg-neutral-900/40 dark:bg-neutral-900/40 light:bg-neutral-50 hover:bg-neutral-850 dark:hover:bg-neutral-850 light:hover:bg-neutral-100 text-neutral-300 dark:text-neutral-300 light:text-neutral-700 border border-neutral-800/60 dark:border-neutral-800/60 light:border-neutral-200"
                >
                  <FileText className="w-3.5 h-3.5 mt-0.5 shrink-0 text-neutral-500" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-medium truncate">
                        {art.title}
                      </span>
                      {art.is_pinned && (
                        <Pin className="w-3 h-3 text-neutral-400 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-400 dark:text-neutral-400 light:text-neutral-500 line-clamp-2 mt-0.5">
                      {art.excerpt}
                    </p>
                    {artSpace && (
                      <span className="inline-block mt-1.5 text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-neutral-900 dark:bg-neutral-900 light:bg-neutral-100 border border-neutral-800 dark:border-neutral-800 light:border-neutral-300 text-neutral-500">
                        {artSpace.name}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
      </>)}

      {/* ===== READING MODE: focused article view ===== */}
      {readingMode && currentArticle && (
        <div className="max-w-4xl mx-auto space-y-3">
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={closeArticle}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-900 dark:bg-neutral-900 light:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-neutral-800 light:hover:bg-neutral-200 border border-neutral-700 dark:border-neutral-700 light:border-neutral-300 text-neutral-200 dark:text-neutral-200 light:text-neutral-800 transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Все статьи</span>
            </button>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => handleExportMarkdown(currentArticle)}
                className="p-1.5 rounded-lg bg-neutral-900 dark:bg-neutral-900 light:bg-neutral-100 hover:bg-neutral-800 text-neutral-400 hover:text-white dark:hover:text-white light:hover:text-black transition-colors"
                title="Скачать Markdown (.md)"
              >
                <Download className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => window.print()}
                className="p-1.5 rounded-lg bg-neutral-900 dark:bg-neutral-900 light:bg-neutral-100 hover:bg-neutral-800 text-neutral-400 hover:text-white dark:hover:text-white light:hover:text-black transition-colors hidden sm:block"
                title="Печать"
              >
                <Printer className="w-3.5 h-3.5" />
              </button>

              {canEdit && (
                <>
                  <button
                    onClick={() => router.push(`/app/knowledge-base/edit/${currentArticle.id}`)}
                    className="px-2.5 py-1.5 rounded-lg bg-neutral-900 dark:bg-neutral-900 light:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-neutral-800 light:hover:bg-neutral-200 border border-neutral-700 dark:border-neutral-700 light:border-neutral-300 text-neutral-200 dark:text-neutral-200 light:text-neutral-800 text-xs font-medium transition-colors flex items-center gap-1"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span className="hidden sm:inline">Редактировать</span>
                  </button>

                  <button
                    onClick={() => handleDeleteArticle(currentArticle.id, currentArticle.title)}
                    className="p-1.5 rounded-lg bg-neutral-900 dark:bg-neutral-900 light:bg-neutral-100 hover:bg-neutral-800 text-neutral-400 hover:text-white dark:hover:text-white light:hover:text-black transition-colors"
                    title="Удалить"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="glass-panel rounded-xl p-4 sm:p-7 border border-neutral-800 dark:border-neutral-800 light:border-neutral-200 shadow-subtle relative">
            <div className="space-y-1.5 pb-4 border-b border-neutral-800 dark:border-neutral-800 light:border-neutral-200">
              <div className="flex items-center gap-2 flex-wrap">
                {currentSpace && (
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-neutral-900 dark:bg-neutral-900 light:bg-neutral-100 border border-neutral-800 dark:border-neutral-800 light:border-neutral-300 text-neutral-400 dark:text-neutral-400 light:text-neutral-600">
                    {currentSpace.name}
                  </span>
                )}
                {currentArticle.is_pinned && (
                  <span className="text-[10px] font-mono text-neutral-400 flex items-center gap-1">
                    <Pin className="w-3 h-3" /> Закреплено
                  </span>
                )}
              </div>

              <h1 className="text-lg sm:text-xl font-semibold text-neutral-100 dark:text-neutral-100 light:text-neutral-900">
                {currentArticle.title}
              </h1>

              <div className="flex items-center gap-3 text-[11px] text-neutral-400 dark:text-neutral-400 light:text-neutral-600 font-mono flex-wrap">
                <span>Автор: {currentArticle.author_name}</span>
                <span>•</span>
                <span>~{currentArticle.read_time_minutes} мин</span>
                <span>•</span>
                <span>{currentArticle.views_count} просм.</span>
              </div>
            </div>

            {currentArticle.tags && currentArticle.tags.length > 0 && (
              <div className="flex items-center gap-1.5 py-2.5 border-b border-neutral-800/60 dark:border-neutral-800/60 light:border-neutral-200">
                <Tag className="w-3 h-3 text-neutral-500" />
                <div className="flex flex-wrap gap-1">
                  {currentArticle.tags.map(t => (
                    <span key={t} className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-neutral-900 dark:bg-neutral-900 light:bg-neutral-100 text-neutral-400 dark:text-neutral-400 light:text-neutral-700 border border-neutral-800 dark:border-neutral-800 light:border-neutral-300">
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="py-4">
              <Markdown
                content={currentArticle.content}
                taskStates={taskStates}
                onTaskToggle={handleTaskToggle}
              />
            </div>

            <div className="pt-4 border-t border-neutral-800 dark:border-neutral-800 light:border-neutral-200 text-[11px] text-neutral-500 font-mono">
              Обновлено: {new Date(currentArticle.updated_at).toLocaleDateString('ru-RU')}
            </div>
          </div>

          {/* Prev / Next navigation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pb-4">
            {prevArticle ? (
              <button
                onClick={() => openArticle(prevArticle.id)}
                className="glass-panel p-3.5 rounded-xl border border-neutral-800 dark:border-neutral-800 light:border-neutral-200 hover:border-neutral-600 dark:hover:border-neutral-600 light:hover:border-neutral-400 transition-colors text-left flex items-center gap-2.5 group"
              >
                <ChevronLeft className="w-4 h-4 text-neutral-500 group-hover:text-white dark:group-hover:text-white light:group-hover:text-black shrink-0 transition-colors" />
                <div className="min-w-0">
                  <div className="text-[10px] uppercase font-mono text-neutral-500 mb-0.5">Предыдущая</div>
                  <div className="text-xs font-medium text-neutral-200 dark:text-neutral-200 light:text-neutral-800 truncate">{prevArticle.title}</div>
                </div>
              </button>
            ) : (
              <button
                onClick={closeArticle}
                className="glass-panel p-3.5 rounded-xl border border-neutral-800 dark:border-neutral-800 light:border-neutral-200 hover:border-neutral-600 dark:hover:border-neutral-600 light:hover:border-neutral-400 transition-colors text-left flex items-center gap-2.5 group"
              >
                <ArrowLeft className="w-4 h-4 text-neutral-500 group-hover:text-white dark:group-hover:text-white light:group-hover:text-black shrink-0 transition-colors" />
                <div className="min-w-0">
                  <div className="text-[10px] uppercase font-mono text-neutral-500 mb-0.5">Начало раздела</div>
                  <div className="text-xs font-medium text-neutral-200 dark:text-neutral-200 light:text-neutral-800 truncate">Вернуться ко всем статьям</div>
                </div>
              </button>
            )}

            {nextArticle ? (
              <button
                onClick={() => openArticle(nextArticle.id)}
                className="glass-panel p-3.5 rounded-xl border border-neutral-800 dark:border-neutral-800 light:border-neutral-200 hover:border-neutral-600 dark:hover:border-neutral-600 light:hover:border-neutral-400 transition-colors text-right flex items-center justify-end gap-2.5 group"
              >
                <div className="min-w-0">
                  <div className="text-[10px] uppercase font-mono text-neutral-500 mb-0.5">Следующая</div>
                  <div className="text-xs font-medium text-neutral-200 dark:text-neutral-200 light:text-neutral-800 truncate">{nextArticle.title}</div>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-white dark:group-hover:text-white light:group-hover:text-black shrink-0 transition-colors" />
              </button>
            ) : (
              <button
                onClick={closeArticle}
                className="glass-panel p-3.5 rounded-xl border border-neutral-800 dark:border-neutral-800 light:border-neutral-200 hover:border-neutral-600 dark:hover:border-neutral-600 light:hover:border-neutral-400 transition-colors text-right flex items-center justify-end gap-2.5 group"
              >
                <div className="min-w-0">
                  <div className="text-[10px] uppercase font-mono text-neutral-500 mb-0.5">Конец раздела</div>
                  <div className="text-xs font-medium text-neutral-200 dark:text-neutral-200 light:text-neutral-800 truncate">Вернуться ко всем статьям</div>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-white dark:group-hover:text-white light:group-hover:text-black shrink-0 transition-colors" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* NEW SPACE MODAL */}
      {showNewSpaceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="glass-panel max-w-md w-full p-5 rounded-xl border border-neutral-800 dark:border-neutral-800 light:border-neutral-200 shadow-elevated space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800 dark:border-neutral-800 light:border-neutral-200">
              <h3 className="text-sm font-semibold text-neutral-100 dark:text-neutral-100 light:text-neutral-900">
                Новое пространство
              </h3>
              <button
                onClick={() => setShowNewSpaceModal(false)}
                className="text-neutral-400 hover:text-white dark:hover:text-white light:hover:text-black"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSpace} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-neutral-300 dark:text-neutral-300 light:text-neutral-700 mb-1">
                  Название
                </label>
                <input
                  type="text"
                  value={newSpaceName}
                  onChange={(e) => setNewSpaceName(e.target.value)}
                  placeholder="Например: Эксплуатация оборудования"
                  required
                  className="glass-input w-full px-3 py-1.5 rounded-lg text-xs text-neutral-100 dark:text-neutral-100 light:text-neutral-900 placeholder-neutral-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 dark:text-neutral-300 light:text-neutral-700 mb-1">
                  Описание
                </label>
                <textarea
                  value={newSpaceDesc}
                  onChange={(e) => setNewSpaceDesc(e.target.value)}
                  placeholder="Краткое описание раздела..."
                  rows={2}
                  className="glass-input w-full px-3 py-1.5 rounded-lg text-xs text-neutral-100 dark:text-neutral-100 light:text-neutral-900 placeholder-neutral-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowNewSpaceModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-neutral-400 hover:text-white"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-black dark:text-black light:text-white bg-white dark:bg-white light:bg-black hover:bg-neutral-200 transition-colors"
                >
                  Создать
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
