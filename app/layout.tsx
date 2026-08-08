import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Exercise Challenge - Track Your Progress',
  description: 'The ultimate exercise challenge app. Track your daily reps with an intuitive dial interface and compete with friends.',
  generator: 'v0.dev',
  icons: {
    icon: [
      { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/favicon.svg', type: 'image/svg+xml' }
    ],
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png'
  },
  manifest: '/site.webmanifest'
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const themeStyle = (process.env.THEME_STYLE || 'glass').toLowerCase();
  const themeClass = themeStyle === 'glass' ? 'theme-glass' : 'theme-neobrut';
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} ${themeClass}`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="min-h-screen gradient-bg">
            {children}
          </div>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
