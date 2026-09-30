import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Roboto, Geist_Mono } from 'next/font/google';
import { Providers } from '@/components/providers';
import './globals.css';

const sans = Roboto({ subsets: ['latin'], variable: '--font-geist-sans' });
const mono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' });

export const metadata: Metadata = {
  title: { default: 'G-TEC Submission Desk', template: '%s · G-TEC Submission Desk' },
  description: 'The operating desk for SEO retainers — time, link building, monthly plans and team output in one place.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${sans.variable} ${mono.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
