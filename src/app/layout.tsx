import type { Metadata } from 'next';
import { Inter, Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import { ThemeProvider } from '@/contexts/ThemeContext';
import '@/styles/globals.css';

// Fonts
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

// Metadata
export const metadata: Metadata = {
  metadataBase: new URL('https://filmmyrun.co.uk'),
  title: {
    default: 'Film My Run | Documentary Filmmaker & Ultra Runner',
    template: '%s | Film My Run',
  },
  description:
    'Award-winning documentary filmmaker, ultra-marathoner, and creator of running tools. Race reports, training insights, and tools for runners.',
  keywords: [
    'running',
    'marathon',
    'ultra marathon',
    'documentary',
    'film',
    'race report',
    'running tools',
    'parkrun',
    'trail running',
  ],
  authors: [{ name: 'Stephen Cousins' }],
  creator: 'Stephen Cousins',
  openGraph: {
    type: 'website',
    locale: 'en_GB',
    url: 'https://filmmyrun.co.uk',
    siteName: 'Film My Run',
    title: 'Film My Run | Documentary Filmmaker & Ultra Runner',
    description:
      'Award-winning documentary filmmaker, ultra-marathoner, and creator of running tools.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Film My Run',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Film My Run',
    description: 'Documentary filmmaker & ultra runner',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#f88c00" />
        {/* Prevent FOUC by setting theme before React hydrates */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  var resolved = theme === 'light' ? 'light' :
                                 theme === 'dark' ? 'dark' :
                                 systemDark ? 'dark' : 'light';
                  document.documentElement.classList.add(resolved);
                } catch (e) {
                  document.documentElement.classList.add('dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body className="font-sans bg-zinc-950 text-white transition-colors">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
