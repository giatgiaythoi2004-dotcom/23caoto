import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Private Casino Table - Ví Phỉnh & Bàn Cược Cá Nhân',
  description: 'Bảng điều khiển cược và quản lý chip thời gian thực cho nhóm chơi bài trực tiếp ngoài đời.',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="dark" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased overflow-x-hidden selection:bg-amber-500 selection:text-black font-sans" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
