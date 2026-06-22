import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Lloyd shell',
  description: 'Your self-hosted Lloyd — runs on your infrastructure, powered by the hosted Lloyd engine.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
