import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/ui/Header';

export const metadata: Metadata = {
  title: 'Himalaya Flood & GLOF Early Warning System',
  description: 'Near-real-time satellite geospatial monitoring and early warning for Himalayan glacial lake outburst floods.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0B111E] text-slate-100 antialiased flex flex-col">
        <Header />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
        <footer className="border-t border-himalaya-border py-4 text-center text-xs text-slate-500 font-mono">
          Himalaya Flood Early Warning System • Optical Sentinel-2 L2A & NASA GPM IMERG Ingestion
        </footer>
      </body>
    </html>
  );
}
