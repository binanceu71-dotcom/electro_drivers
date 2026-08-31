'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, BookOpen, X, ArrowRight, CornerDownLeft, FileText } from 'lucide-react';
import { Article, Space } from '@/lib/types';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [articles, setArticles] = useState<Article[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);

  useEffect(() => {
    if (isOpen) {
      Promise.all([
        fetch('/api/articles').then(r => r.json()),
        fetch('/api/spaces').then(r => r.json())
      ]).then(([artData, spaceData]) => {
        setArticles(artData.articles || []);
        setSpaces(spaceData.spaces || []);
      });
    }
  }, [isOpen]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!isOpen) return null;

  const q = query.trim().toLowerCase();
  const filteredArticles = q
    ? articles.filter(a => 
        a.title.toLowerCase().includes(q) || 
        a.content.toLowerCase().includes(q) || 
        a.tags.some(t => t.toLowerCase().includes(q))
      )
    : articles.slice(0, 5);

  const filteredSpaces = q
    ? spaces.filter(s => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q))
    : spaces;

  const navigateToArticle = (id: string) => {
    router.push(`/app/knowledge-base?article=${id}`);
    onClose();
  };

  const navigateToSpace = (id: string) => {
    router.push(`/app/knowledge-base?space=${id}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="w-full max-w-2xl bg-neutral-900 dark:bg-neutral-900 light:bg-white border border-neutral-800 dark:border-neutral-800 light:border-neutral-200 rounded-xl shadow-elevated overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-neutral-800 dark:border-neutral-800 light:border-neutral-200 flex items-center gap-3">
          <Search className="w-4 h-4 text-neutral-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по базе знаний и регламентам..."
            autoFocus
            className="w-full bg-transparent text-xs text-neutral-100 dark:text-neutral-100 light:text-neutral-900 placeholder-neutral-500 outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-neutral-400 hover:text-white p-1">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-neutral-400 bg-neutral-800 dark:bg-neutral-800 light:bg-neutral-100 rounded border border-neutral-700">
            ESC
          </kbd>
        </div>

        <div className="overflow-y-auto p-4 space-y-4">
          {filteredSpaces.length > 0 && (
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 mb-2">
                Пространства ({filteredSpaces.length})
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {filteredSpaces.map(s => (
                  <button
                    key={s.id}
                    onClick={() => navigateToSpace(s.id)}
                    className="p-2.5 rounded-lg bg-neutral-850 dark:bg-neutral-850 light:bg-neutral-50 hover:bg-neutral-800 dark:hover:bg-neutral-800 light:hover:bg-neutral-100 border border-neutral-800 dark:border-neutral-800 light:border-neutral-200 text-left transition-all flex items-center gap-2.5"
                  >
                    <BookOpen className="w-4 h-4 text-neutral-400 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-neutral-200 dark:text-neutral-200 light:text-neutral-800 truncate">
                        {s.name}
                      </div>
                      <div className="text-[10px] text-neutral-500 truncate">{s.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 mb-2">
              {query ? `Результаты поиска (${filteredArticles.length})` : 'Документация'}
            </div>
            {filteredArticles.length === 0 ? (
              <div className="text-center py-6 text-xs text-neutral-500">
                Ничего не найдено
              </div>
            ) : (
              <div className="space-y-1">
                {filteredArticles.map(a => (
                  <button
                    key={a.id}
                    onClick={() => navigateToArticle(a.id)}
                    className="w-full p-2.5 rounded-lg bg-neutral-850 dark:bg-neutral-850 light:bg-neutral-50 hover:bg-neutral-800 dark:hover:bg-neutral-800 light:hover:bg-neutral-100 border border-neutral-800 dark:border-neutral-800 light:border-neutral-200 text-left transition-all flex items-center justify-between group"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="text-xs font-medium text-neutral-200 dark:text-neutral-200 light:text-neutral-900 truncate">
                        {a.title}
                      </div>
                      <div className="text-[10px] text-neutral-400 dark:text-neutral-400 light:text-neutral-500 line-clamp-1 mt-0.5">
                        {a.excerpt}
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-neutral-500 group-hover:text-white dark:group-hover:text-white light:group-hover:text-black shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-3 bg-neutral-950/80 dark:bg-neutral-950/80 light:bg-neutral-100 border-t border-neutral-800 dark:border-neutral-800 light:border-neutral-200 flex items-center justify-between text-[10px] text-neutral-500 font-mono">
          <span className="flex items-center gap-1">
            <CornerDownLeft className="w-3 h-3" /> переход к статье
          </span>
          <button onClick={onClose} className="hover:text-white">
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
