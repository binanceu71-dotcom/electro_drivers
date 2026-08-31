'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ArticleEditor from '@/components/ArticleEditor';
import { Article } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/Toast';

export default function EditArticlePage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params?.id) {
      fetch(`/api/articles/${params.id}`)
        .then(r => {
          if (!r.ok) throw new Error('Статья не найдена');
          return r.json();
        })
        .then(d => setArticle(d.article))
        .catch(err => {
          toast.error('Ошибка загрузки статьи');
          router.push('/app/knowledge-base');
        })
        .finally(() => setLoading(false));
    }
  }, [params?.id, router, toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-cyan-400">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!article) return null;

  return <ArticleEditor initialArticle={article} isNew={false} />;
}
