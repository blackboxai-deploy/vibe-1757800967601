'use client'

import SnakeGame from '@/components/SnakeGame'

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-green-400 via-green-500 to-green-600 bg-clip-text text-transparent mb-4">
            SNAKE GAME
          </h1>
          <p className="text-gray-300 text-lg">
            Classic arcade action with modern style
          </p>
        </div>
        <SnakeGame />
      </div>
    </main>
  )
}