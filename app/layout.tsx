import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/lib/ThemeContext';
import { AuthProvider } from '@/lib/AuthContext';
import { ToastProvider } from '@/components/Toast';

export const metadata: Metadata = {
  title: 'Electrodrivers Portal | Закрытый корпоративный SaaS-портал',
  description: 'Закрытый корпоративный портал Electrodrivers: мониторинг, аналитика, онбординг и база знаний',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className="dark">
      <body className="min-h-screen bg-[#040714] text-slate-100 dark:bg-[#040714] dark:text-slate-100 transition-colors duration-300">
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
