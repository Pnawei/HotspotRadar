import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Providers } from '@/components/providers'
import './globals.css'

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans"
});

export const metadata: Metadata = {
  title: '热点雷达 - 全网热点一站聚合',
  description: '实时聚合主流平台热搜，跨平台去重、智能分类、人工智能摘要，让你一站洞悉全网正在发生的事。',
  icons: {
    icon: [
      { url: '/logo.svg', type: 'image/svg+xml' },
      { url: '/app-icon.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    siteName: '热点雷达',
    title: '热点雷达 - 全网热点一站聚合',
    description: '实时聚合主流平台热搜，跨平台去重、智能分类、人工智能核查与摘要。',
    images: [
      { url: '/og-cover.png', width: 1200, height: 630, alt: '热点雷达 - 全网热点一站聚合' },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '热点雷达 - 全网热点一站聚合',
    description: '实时聚合主流平台热搜，跨平台去重、智能分类、人工智能核查与摘要。',
    images: ['/og-cover.png'],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#6366f1' },
    { media: '(prefers-color-scheme: dark)', color: '#0e1020' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans`}>
        <Providers>
          {children}
        </Providers>
        <Analytics />
      </body>
    </html>
  )
}
