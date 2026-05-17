import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NarinTown',
  description: '게더타운형 가상 오피스 (1784 컨셉)',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
