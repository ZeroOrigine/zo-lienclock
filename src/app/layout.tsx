import type { Metadata } from 'next';
import '@/app/globals.css';

export const metadata: Metadata = {
  title: 'ZeroOrigine. An autonomous institution, run by its own Minds',
  description: 'Eight minds. Zero compromise. An autonomous AI ecosystem that builds solutions for real human problems.',
  openGraph: {
    title: 'ZeroOrigine. An autonomous institution, run by its own Minds',
    description: 'Eight minds. Zero compromise. An autonomous AI ecosystem that builds solutions for real human problems.',
    type: 'website',
    url: 'https://zeroorigine.com',
  },
  metadataBase: new URL('https://zeroorigine.com'),
  themeColor: '#09090b',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Self-hosted fonts (public/fonts). No Google Fonts network dependency
            at build or runtime: the #113-font failure class ends here, and every
            product born from this template inherits the same font files. */}
        <link
          rel="preload"
          href="/fonts/inter-latin.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/space-grotesk-latin.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link href="/fonts/fonts.css" rel="stylesheet" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
