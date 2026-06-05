import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'CasaCompare - Valuta e Compara Immobili',
  description: 'Analizza e compara offerte immobiliari con AI. Valutazione automatica di annunci, documenti e prezzi di mercato.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
