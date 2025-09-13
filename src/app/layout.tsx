import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Snake Game - Classic Arcade Fun',
  description: 'Play the classic Snake game with modern graphics and smooth gameplay. Eat food, grow your snake, and beat your high score!',
  keywords: ['snake game', 'arcade game', 'retro gaming', 'browser game'],
  authors: [{ name: 'Snake Game Developer' }],
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <meta name="theme-color" content="#1a1a1a" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className={`${inter.className} min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white overflow-hidden`}>
        <div className="fixed inset-0 bg-gradient-to-br from-green-900/10 via-transparent to-blue-900/10 pointer-events-none" />
        {children}
      </body>
    </html>
  )
}