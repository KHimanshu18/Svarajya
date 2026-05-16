import type { Metadata } from 'next';
import { Inter, Cinzel } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { ToastProvider } from '@/components/providers/ToastProvider';
import { LanguageProvider } from '@/context/landing/LanguageContext';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const cinzel = Cinzel({
  subsets: ['latin'],
  variable: '--font-cinzel',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Svarajya — Financial Sovereignty for Indian Families',
    template: '%s | Svarajya',
  },
  description: 'Take charge of your financial kingdom. Track income, expenses, loans, insurance, and documents — all in one privacy-first platform built for Indian families.',
  manifest: '/manifest.json',
  openGraph: {
    title: 'Svarajya — Financial Sovereignty',
    description: 'A gamified, privacy-forward financial governance system for Indian families.',
    siteName: 'Svarajya',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Svarajya — Financial Sovereignty',
    description: 'Take charge of your financial kingdom.',
  },
};


export const viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${cinzel.variable}`} suppressHydrationWarning>
      <head>
        {/* Pre-hydration theme script — runs before React, no flash */}
        <script
          id="theme-initializer"
          dangerouslySetInnerHTML={{
            __html: `
          (function() {
            try {
              var t = localStorage.getItem('rajya-theme');
              if (t === 'light' || t === 'dark') {
                document.documentElement.classList.add(t);
                document.documentElement.style.colorScheme = t;
              } else {
                document.documentElement.classList.add('dark');
                document.documentElement.style.colorScheme = 'dark';
              }
            } catch(e) {
              document.documentElement.classList.add('dark');
            }
          })();
        `}} />
      </head>
      <body suppressHydrationWarning className="bg-[var(--color-rajya-bg)] text-[var(--color-rajya-text)] font-sans antialiased min-h-screen selection:bg-[var(--color-rajya-accent)] selection:text-black">
        {/* Mobile: centered narrow column. Desktop: full-width */}
        <div className="max-w-md mx-auto min-h-screen bg-[var(--color-rajya-bg)] relative overflow-hidden shadow-2xl shadow-black/50 border-x border-white/5 lg:max-w-none lg:overflow-visible lg:shadow-none lg:border-x-0">
          <ThemeProvider>
            <AuthProvider>
              <ToastProvider>
                <LanguageProvider>
                  {children}
                </LanguageProvider>
              </ToastProvider>
            </AuthProvider>
          </ThemeProvider>
        </div>
      </body>
    </html>
  );
}

