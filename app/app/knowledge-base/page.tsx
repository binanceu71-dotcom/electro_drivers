'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/Toast';
import { Space, Article } from '@/lib/types';
import { isAdmin } from '@/lib/auth-helpers';
import { 
  BookOpen, Plus, Search, Tag, 
  Edit3, Trash2, Pin, Download, Printer, 
  FileText, X, Layers, ExternalLink, Video
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
      } else if (arts.length > 0 && !selectedArticleId) {
        setSelectedArticleId(arts[0].id);
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
    } else if (articles.length > 0 && !selectedArticleId) {
      setSelectedArticleId(articles[0].id);
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

  const currentArticle = articles.find(a => a.id === selectedArticleId || a.slug === selectedArticleId) || filteredArticles[0];
  const currentSpace = spaces.find(s => s.id === currentArticle?.space_id);
  const allTags = Array.from(new Set(articles.flatMap(a => a.tags || [])));

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

  // Rich Markdown parser with links, images, video embeds, checklists, tables
  const renderMarkdown = (content: string) => {
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let inTable = false;
    let tableRows: string[][] = [];
    let inCode = false;
    let codeLines: string[] = [];

    // Helper to format inline markdown (links [text](url), bold **b**, italic *i*, code `c`)
    const parseInline = (raw: string): React.ReactNode => {
      // Parse markdown link: [text](url)
      const parts: React.ReactNode[] = [];
      let lastIndex = 0;
      const linkRegex = /\[(.*?)\]\((.*?)\)/g;
      let match;

      while ((match = linkRegex.exec(raw)) !== null) {
        if (match.index > lastIndex) {
          parts.push(raw.substring(lastIndex, match.index));
        }
        const text = match[1];
        const url = match[2];
        parts.push(
          <a
            key={`link-${match.index}`}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-neutral-100 dark:text-neutral-100 light:text-black font-semibold hover:opacity-80 inline-flex items-center gap-0.5"
          >
            <span>{text}</span>
            <ExternalLink className="w-3 h-3 inline" />
          </a>
        );
        lastIndex = match.index + match[0].length;
      }

      if (lastIndex < raw.length) {
        parts.push(raw.substring(lastIndex));
      }

      return parts.length > 0 ? parts : raw;
    };

    lines.forEach((line, idx) => {
      if (line.startsWith('```')) {
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

      if (inCode) {
        codeLines.push(line);
        return;
      }

      if (line.startsWith('|')) {
        inTable = true;
        const cells = line.split('|').slice(1, -1).map(c => c.trim());
        if (!cells.every(c => c.includes('---') || c.includes(':--'))) {
          tableRows.push(cells);
        }
        return;
      } else if (inTable) {
        inTable = false;
        if (tableRows.length > 0) {
          const header = tableRows[0];
          const body = tableRows.slice(1);
          elements.push(
            <div key={`tbl-${idx}`} className="overflow-x-auto my-4 rounded-lg border border-neutral-800 dark:border-neutral-800 light:border-neutral-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-900 dark:bg-neutral-900 light:bg-neutral-100 text-neutral-400 dark:text-neutral-400 light:text-neutral-700 uppercase font-mono">
                  <tr>
                    {header.map((th, hIdx) => (
                      <th key={hIdx} className="p-2.5 border-b border-neutral-800 dark:border-neutral-800 light:border-neutral-200 font-medium">{th}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800 dark:divide-neutral-800 light:divide-neutral-200 bg-neutral-950/40 dark:bg-neutral-950/40 light:bg-white">
                  {body.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-neutral-900/40 dark:hover:bg-neutral-900/40 light:hover:bg-neutral-50">
                      {row.map((td, dIdx) => (
                        <td key={dIdx} className="p-2.5 text-neutral-300 dark:text-neutral-300 light:text-neutral-800">{td}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
          tableRows = [];
        }
      }

      // Photos / Images / GIFs: ![alt](url)
      if (line.startsWith('![') && line.includes('](')) {
        const match = line.match(/!\[(.*?)\]\((.*?)\)/);
        if (match) {
          elements.push(
            <div key={`img-${idx}`} className="my-3 rounded-lg overflow-hidden border border-neutral-800 dark:border-neutral-800 light:border-neutral-200">
              <img src={match[2]} alt={match[1]} className="w-full max-h-80 object-cover" />
              {match[1] && (
                <div className="p-2 text-[11px] text-neutral-400 dark:text-neutral-400 light:text-neutral-600 font-mono text-center bg-neutral-950 dark:bg-neutral-950 light:bg-neutral-100 border-t border-neutral-800 dark:border-neutral-800 light:border-neutral-200">
                  {match[1]}
                </div>
              )}
            </div>
          );
          return;
        }
      }

      // Video embeds: [video: url](caption)
      if (line.startsWith('[video: ') && line.includes('](')) {
        const match = line.match(/\[video:\s*(.*?)\]\((.*?)\)/);
        if (match) {
          const url = match[1];
          const caption = match[2];
          elements.push(
            <div key={`vid-${idx}`} className="my-3 p-3.5 rounded-lg border border-neutral-800 dark:border-neutral-800 light:border-neutral-200 bg-neutral-900 dark:bg-neutral-900 light:bg-neutral-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-medium text-neutral-200 dark:text-neutral-200 light:text-neutral-900">
                <Video className="w-4 h-4 text-neutral-400" />
                <span>{caption || 'Видеоинструкция'}</span>
              </div>
              <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs underline flex items-center gap-1 font-mono text-neutral-100 dark:text-neutral-100 light:text-black">
                Смотреть видео <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          );
          return;
        }
      }

      // Task / Checklists: - [x] or - [ ]
      if (line.startsWith('- [x] ') || line.startsWith('- [ ] ')) {
        const isChecked = line.startsWith('- [x] ');
        const label = line.replace(/- \[[ x]\] /, '');
        elements.push(
          <div key={`task-${idx}`} className="flex items-center gap-2.5 my-1 text-xs text-neutral-300 dark:text-neutral-300 light:text-neutral-800">
            <input
              type="checkbox"
              checked={isChecked}
              readOnly
              className="w-4 h-4 rounded border-neutral-600 dark:border-neutral-600 light:border-neutral-400"
            />
            <span className={isChecked ? 'line-through text-neutral-500' : ''}>
              {parseInline(label)}
            </span>
          </div>
        );
        return;
      }

      if (line.startsWith('## ')) {
        elements.push(
          <h2 key={idx} className="text-base font-semibold text-neutral-100 dark:text-neutral-100 light:text-neutral-900 mt-5 mb-2 pb-1.5 border-b border-neutral-800 dark:border-neutral-800 light:border-neutral-200">
            {line.replace('## ', '')}
          </h2>
        );
        return;
      }
      if (line.startsWith('### ')) {
        elements.push(
          <h3 key={idx} className="text-xs font-semibold text-neutral-200 dark:text-neutral-200 light:text-neutral-800 uppercase tracking-wider mt-4 mb-2">
            {line.replace('### ', '')}
          </h3>
        );
        return;
      }

      if (line.startsWith('> ')) {
        elements.push(
          <div key={idx} className="my-3 p-3 rounded-lg bg-neutral-900 dark:bg-neutral-900 light:bg-neutral-100 border-l-2 border-neutral-400 dark:border-neutral-400 light:border-black text-neutral-300 dark:text-neutral-300 light:text-neutral-800 text-xs leading-relaxed">
            {parseInline(line.replace('> ', ''))}
          </div>
        );
        return;
      }

      if (line.trim() === '---') {
        elements.push(<hr key={idx} className="my-5 border-neutral-800 dark:border-neutral-800 light:border-neutral-200" />);
        return;
      }

      if (line.startsWith('- ') || line.startsWith('* ')) {
        elements.push(
          <li key={idx} className="text-xs text-neutral-300 dark:text-neutral-300 light:text-neutral-800 ml-4 list-disc mb-1 leading-relaxed">
            {parseInline(line.substring(2))}
          </li>
        );
        return;
      }

      if (/^\d+\.\s/.test(line)) {
        elements.push(
          <li key={idx} className="text-xs text-neutral-300 dark:text-neutral-300 light:text-neutral-800 ml-4 list-decimal mb-1.5 leading-relaxed">
            {parseInline(line.replace(/^\d+\.\s/, ''))}
          </li>
        );
        return;
      }

      if (line.trim().length > 0) {
        elements.push(
          <p key={idx} className="text-xs text-neutral-300 dark:text-neutral-300 light:text-neutral-800 mb-2.5 leading-relaxed">
            {parseInline(line)}
          </p>
        );
      }
    });

    return elements;
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
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
            <button
              key={sp.id}
              onClick={() => setSelectedSpaceId(sp.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
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
          );
        })}
      </div>

      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: List (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
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

            <div className="space-y-1 max-h-[600px] overflow-y-auto pr-0.5">
              {filteredArticles.length === 0 ? (
                <div className="text-center py-6 text-xs text-neutral-500">
                  Нет статей
                </div>
              ) : (
                filteredArticles.map(art => {
                  const isSelected = selectedArticleId === art.id;
                  return (
                    <button
                      key={art.id}
                      onClick={() => setSelectedArticleId(art.id)}
                      className={`w-full p-2.5 rounded-lg text-left transition-colors flex items-start gap-2.5 ${
                        isSelected
                          ? 'bg-neutral-800 dark:bg-neutral-800 light:bg-neutral-200 text-white dark:text-white light:text-black'
                          : 'bg-neutral-900/40 dark:bg-neutral-900/40 light:bg-neutral-50 hover:bg-neutral-850 text-neutral-300 dark:text-neutral-300 light:text-neutral-700'
                      }`}
                    >
                      <FileText className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${isSelected ? 'text-white dark:text-white light:text-black' : 'text-neutral-500'}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-medium truncate">
                            {art.title}
                          </span>
                          {art.is_pinned && (
                            <Pin className="w-3 h-3 text-neutral-400 shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-neutral-400 dark:text-neutral-400 light:text-neutral-500 line-clamp-1 mt-0.5">
                          {art.excerpt}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right: Document View (8 cols) */}
        <div className="lg:col-span-8">
          {currentArticle ? (
            <div className="glass-panel rounded-xl p-6 sm:p-7 border border-neutral-800 dark:border-neutral-800 light:border-neutral-200 shadow-subtle relative">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-neutral-800 dark:border-neutral-800 light:border-neutral-200">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
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

                  <div className="flex items-center gap-3 text-[11px] text-neutral-400 dark:text-neutral-400 light:text-neutral-600 font-mono">
                    <span>Автор: {currentArticle.author_name}</span>
                    <span>•</span>
                    <span>~{currentArticle.read_time_minutes} мин</span>
                    <span>•</span>
                    <span>{currentArticle.views_count} просм.</span>
                  </div>
                </div>

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
                        <span>Редактировать</span>
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
                {renderMarkdown(currentArticle.content)}
              </div>

              <div className="pt-4 border-t border-neutral-800 dark:border-neutral-800 light:border-neutral-200 text-[11px] text-neutral-500 font-mono">
                Обновлено: {new Date(currentArticle.updated_at).toLocaleDateString('ru-RU')}
              </div>
            </div>
          ) : (
            <div className="glass-panel rounded-xl p-8 text-center border border-neutral-800">
              <BookOpen className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
              <p className="text-xs text-neutral-400">Выберите статью для чтения</p>
            </div>
          )}
        </div>
      </div>

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
