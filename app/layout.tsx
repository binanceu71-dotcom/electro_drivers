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
    <html lang="ru" className="dark" suppressHydrationWarning>
      <body className="min-h-screen transition-colors duration-200">
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
