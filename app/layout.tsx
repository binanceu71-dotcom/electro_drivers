import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/lib/ThemeContext';
import { AuthProvider } from '@/lib/AuthContext';
import { ToastProvider } from '@/components/Toast';
import GlobalErrorBoundary from '@/components/GlobalErrorBoundary';
import buildInfo from '@/lib/build-info.json';

/**
 * КРИТИЧНО: запрещаем статическое кэширование HTML.
 *
 * Без этого Next.js отдаёт пререндеренные страницы с заголовком
 * `Cache-Control: s-maxage=31536000, stale-while-revalidate`, и любой
 * промежуточный кэш (CDN, Cloudflare, прокси хостинга) может ГОД отдавать
 * старый HTML со ссылками на старые JS-чанки. Именно это приводило к
 * «неубиваемому» белому экрану: код чинили, а браузеры продолжали получать
 * закэшированную сломанную сборку.
 *
 * Портал закрытый и полностью клиент-рендерный, SSR-оболочки страниц лёгкие —
 * потеря статической оптимизации здесь несущественна, а корректность важнее.
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Electrodrivers Portal | Закрытый корпоративный SaaS-портал',
  description: 'Закрытый корпоративный портал Electrodrivers: мониторинг, аналитика, онбординг и база знаний',
  other: {
    'x-build-id': buildInfo.buildId,
    'x-build-time': buildInfo.buildTime,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className="dark" suppressHydrationWarning>
      <body className="min-h-screen transition-colors duration-200">
        <GlobalErrorBoundary>
          <ThemeProvider>
            <AuthProvider>
              <ToastProvider>
                {children}
              </ToastProvider>
            </AuthProvider>
          </ThemeProvider>
        </GlobalErrorBoundary>
      </body>
    </html>
  );
}
