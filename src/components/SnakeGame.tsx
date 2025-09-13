'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import {
  GAME_CONFIG,
  Direction,
  GameState,
  initializeGameState,
  moveSnake,
  checkCollision,
  checkFoodCollision,
  generateFood,
  calculateSpeed,
  saveHighScore,
  getOppositeDirection,
} from '@/lib/gameLogic'

const SnakeGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameLoopRef = useRef<number>(0)
  const lastMoveTimeRef = useRef<number>(0)
  const audioContextRef = useRef<AudioContext | null>(null)

  const [gameState, setGameState] = useState<GameState>(initializeGameState)
  const [pendingDirection, setPendingDirection] = useState<Direction | null>(null)

  // Initialize audio context
  useEffect(() => {
    const initAudio = () => {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      } catch (error) {
        console.warn('Audio not supported:', error)
      }
    }
    initAudio()
    
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])

  // Sound effect functions
  const playSound = useCallback((frequency: number, duration: number, type: 'sine' | 'square' | 'triangle' = 'sine') => {
    if (!audioContextRef.current) return
    
    try {
      const oscillator = audioContextRef.current.createOscillator()
      const gainNode = audioContextRef.current.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContextRef.current.destination)
      
      oscillator.type = type
      oscillator.frequency.value = frequency
      
      gainNode.gain.setValueAtTime(0.1, audioContextRef.current.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + duration)
      
      oscillator.start(audioContextRef.current.currentTime)
      oscillator.stop(audioContextRef.current.currentTime + duration)
    } catch (error) {
      console.warn('Audio playback error:', error)
    }
  }, [])

  const playEatSound = useCallback(() => playSound(800, 0.1, 'triangle'), [playSound])
  const playGameOverSound = useCallback(() => {
    playSound(200, 0.5, 'square')
    setTimeout(() => playSound(150, 0.3, 'square'), 200)
  }, [playSound])

  // Handle input
  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (gameState.gameStatus === 'menu') {
      if (event.code === 'Space' || event.code === 'Enter') {
        startGame()
      }
      return
    }

    if (gameState.gameStatus === 'gameOver') {
      if (event.code === 'Space' || event.code === 'Enter') {
        resetGame()
      }
      return
    }

    if (gameState.gameStatus === 'playing') {
      let newDirection: Direction | null = null

      switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
          newDirection = 'UP'
          break
        case 'ArrowDown':
        case 'KeyS':
          newDirection = 'DOWN'
          break
        case 'ArrowLeft':
        case 'KeyA':
          newDirection = 'LEFT'
          break
        case 'ArrowRight':
        case 'KeyD':
          newDirection = 'RIGHT'
          break
        case 'Space':
          togglePause()
          break
      }

      if (newDirection && newDirection !== getOppositeDirection(gameState.direction)) {
        setPendingDirection(newDirection)
      }
    }

    if (gameState.gameStatus === 'paused' && event.code === 'Space') {
      togglePause()
    }
  }, [gameState.gameStatus, gameState.direction])

  // Touch controls for mobile
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null)

  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    const touch = event.touches[0]
    setTouchStart({ x: touch.clientX, y: touch.clientY })
  }, [])

  const handleTouchEnd = useCallback((event: React.TouchEvent) => {
    if (!touchStart) return

    const touch = event.changedTouches[0]
    const deltaX = touch.clientX - touchStart.x
    const deltaY = touch.clientY - touchStart.y
    const minSwipeDistance = 30

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (Math.abs(deltaX) > minSwipeDistance) {
        const newDirection = deltaX > 0 ? 'RIGHT' : 'LEFT'
        if (gameState.gameStatus === 'playing' && newDirection !== getOppositeDirection(gameState.direction)) {
          setPendingDirection(newDirection)
        }
      }
    } else {
      if (Math.abs(deltaY) > minSwipeDistance) {
        const newDirection = deltaY > 0 ? 'DOWN' : 'UP'
        if (gameState.gameStatus === 'playing' && newDirection !== getOppositeDirection(gameState.direction)) {
          setPendingDirection(newDirection)
        }
      }
    }

    setTouchStart(null)
  }, [touchStart, gameState.gameStatus, gameState.direction])

  const handleTouchTap = useCallback(() => {
    if (gameState.gameStatus === 'menu') {
      startGame()
    } else if (gameState.gameStatus === 'gameOver') {
      resetGame()
    } else if (gameState.gameStatus === 'playing' || gameState.gameStatus === 'paused') {
      togglePause()
    }
  }, [gameState.gameStatus])

  // Game control functions
  const startGame = useCallback(() => {
    setGameState(prevState => ({
      ...prevState,
      gameStatus: 'playing',
    }))
  }, [])

  const togglePause = useCallback(() => {
    setGameState(prevState => ({
      ...prevState,
      gameStatus: prevState.gameStatus === 'playing' ? 'paused' : 'playing',
    }))
  }, [])

  const resetGame = useCallback(() => {
    const newGameState = initializeGameState()
    newGameState.highScore = gameState.highScore
    setGameState(newGameState)
    setPendingDirection(null)
  }, [gameState.highScore])

  // Main game loop
  const gameLoop = useCallback((currentTime: number) => {
    if (gameState.gameStatus !== 'playing') {
      gameLoopRef.current = requestAnimationFrame(gameLoop)
      return
    }

    if (currentTime - lastMoveTimeRef.current >= gameState.speed) {
      setGameState(prevState => {
        const currentDirection = pendingDirection || prevState.direction
        setPendingDirection(null)

        const newSnake = moveSnake(prevState.snake, currentDirection)
        const head = newSnake[0]

        // Check collisions
        if (checkCollision(head, prevState.snake)) {
          playGameOverSound()
          const newHighScore = Math.max(prevState.score, prevState.highScore)
          if (newHighScore > prevState.highScore) {
            saveHighScore(newHighScore)
          }
          return {
            ...prevState,
            gameStatus: 'gameOver',
            highScore: newHighScore,
          }
        }

        // Check food collision
        if (checkFoodCollision(head, prevState.food)) {
          playEatSound()
          const newScore = prevState.score + GAME_CONFIG.POINTS_PER_FOOD
          const newSpeed = calculateSpeed(newScore)
          const grownSnake = [...newSnake, prevState.snake[prevState.snake.length - 1]]
          const newFood = generateFood(grownSnake)

          return {
            ...prevState,
            snake: grownSnake,
            direction: currentDirection,
            food: newFood,
            score: newScore,
            speed: newSpeed,
          }
        }

        return {
          ...prevState,
          snake: newSnake,
          direction: currentDirection,
        }
      })

      lastMoveTimeRef.current = currentTime
    }

    gameLoopRef.current = requestAnimationFrame(gameLoop)
  }, [gameState.gameStatus, gameState.speed, pendingDirection, playEatSound, playGameOverSound])

  // Start game loop
  useEffect(() => {
    gameLoopRef.current = requestAnimationFrame(gameLoop)
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current)
      }
    }
  }, [gameLoop])

  // Event listeners
  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [handleKeyPress])

  // Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.fillStyle = '#111827'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw grid
    ctx.strokeStyle = '#1f2937'
    ctx.lineWidth = 0.5
    for (let x = 0; x <= GAME_CONFIG.BOARD_WIDTH; x++) {
      ctx.beginPath()
      ctx.moveTo(x * GAME_CONFIG.CELL_SIZE, 0)
      ctx.lineTo(x * GAME_CONFIG.CELL_SIZE, canvas.height)
      ctx.stroke()
    }
    for (let y = 0; y <= GAME_CONFIG.BOARD_HEIGHT; y++) {
      ctx.beginPath()
      ctx.moveTo(0, y * GAME_CONFIG.CELL_SIZE)
      ctx.lineTo(canvas.width, y * GAME_CONFIG.CELL_SIZE)
      ctx.stroke()
    }

    // Draw food with glow effect
    const foodX = gameState.food.x * GAME_CONFIG.CELL_SIZE
    const foodY = gameState.food.y * GAME_CONFIG.CELL_SIZE
    
    ctx.shadowColor = '#ef4444'
    ctx.shadowBlur = 10
    ctx.fillStyle = '#ef4444'
    ctx.fillRect(foodX + 2, foodY + 2, GAME_CONFIG.CELL_SIZE - 4, GAME_CONFIG.CELL_SIZE - 4)
    ctx.shadowBlur = 0

    // Draw snake
    gameState.snake.forEach((segment, index) => {
      const x = segment.x * GAME_CONFIG.CELL_SIZE
      const y = segment.y * GAME_CONFIG.CELL_SIZE
      
      if (index === 0) {
        // Head with glow
        ctx.shadowColor = '#22c55e'
        ctx.shadowBlur = 8
        ctx.fillStyle = '#22c55e'
        ctx.fillRect(x + 1, y + 1, GAME_CONFIG.CELL_SIZE - 2, GAME_CONFIG.CELL_SIZE - 2)
        ctx.shadowBlur = 0
        
        // Eyes
        ctx.fillStyle = '#111827'
        const eyeSize = 3
        const eyeOffset = 6
        if (gameState.direction === 'RIGHT') {
          ctx.fillRect(x + GAME_CONFIG.CELL_SIZE - eyeOffset, y + 5, eyeSize, eyeSize)
          ctx.fillRect(x + GAME_CONFIG.CELL_SIZE - eyeOffset, y + 12, eyeSize, eyeSize)
        } else if (gameState.direction === 'LEFT') {
          ctx.fillRect(x + 3, y + 5, eyeSize, eyeSize)
          ctx.fillRect(x + 3, y + 12, eyeSize, eyeSize)
        } else if (gameState.direction === 'UP') {
          ctx.fillRect(x + 5, y + 3, eyeSize, eyeSize)
          ctx.fillRect(x + 12, y + 3, eyeSize, eyeSize)
        } else {
          ctx.fillRect(x + 5, y + GAME_CONFIG.CELL_SIZE - eyeOffset, eyeSize, eyeSize)
          ctx.fillRect(x + 12, y + GAME_CONFIG.CELL_SIZE - eyeOffset, eyeSize, eyeSize)
        }
      } else {
        // Body segments with gradient
        const opacity = Math.max(0.3, 1 - (index * 0.05))
        ctx.fillStyle = `rgba(34, 197, 94, ${opacity})`
        ctx.fillRect(x + 2, y + 2, GAME_CONFIG.CELL_SIZE - 4, GAME_CONFIG.CELL_SIZE - 4)
      }
    })
  }, [gameState])

  const getStatusText = () => {
    switch (gameState.gameStatus) {
      case 'menu':
        return (
          <div className="text-center">
            <h2 className="text-2xl mb-4">Ready to Play?</h2>
            <p className="text-gray-400 mb-2">Use arrow keys or WASD to move</p>
            <p className="text-gray-400 mb-4">Press SPACE to pause</p>
            <p className="text-green-400 font-bold">Press SPACE or ENTER to start</p>
          </div>
        )
      case 'paused':
        return (
          <div className="text-center">
            <h2 className="text-2xl mb-4 text-yellow-400">Game Paused</h2>
            <p className="text-gray-400">Press SPACE to continue</p>
          </div>
        )
      case 'gameOver':
        return (
          <div className="text-center">
            <h2 className="text-2xl mb-4 text-red-400">Game Over!</h2>
            <p className="text-gray-400 mb-2">Final Score: {gameState.score}</p>
            {gameState.score === gameState.highScore && gameState.score > 0 && (
              <p className="text-yellow-400 mb-2">🏆 New High Score!</p>
            )}
            <p className="text-green-400 font-bold">Press SPACE or ENTER to play again</p>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="flex flex-col items-center space-y-6">
      {/* HUD */}
      <div className="flex justify-between w-full max-w-2xl px-4">
        <div className="text-center">
          <div className="text-sm text-gray-400">Score</div>
          <div className="text-2xl font-bold text-green-400">{gameState.score}</div>
        </div>
        <div className="text-center">
          <div className="text-sm text-gray-400">High Score</div>
          <div className="text-2xl font-bold text-yellow-400">{gameState.highScore}</div>
        </div>
        <div className="text-center">
          <div className="text-sm text-gray-400">Speed</div>
          <div className="text-2xl font-bold text-blue-400">
            {Math.round(((GAME_CONFIG.INITIAL_SPEED - gameState.speed) / (GAME_CONFIG.INITIAL_SPEED - GAME_CONFIG.MIN_SPEED)) * 100)}%
          </div>
        </div>
      </div>

      {/* Game Canvas */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={GAME_CONFIG.BOARD_WIDTH * GAME_CONFIG.CELL_SIZE}
          height={GAME_CONFIG.BOARD_HEIGHT * GAME_CONFIG.CELL_SIZE}
          className="border-2 border-gray-600 rounded-lg shadow-2xl"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onClick={handleTouchTap}
        />
        
        {/* Game Status Overlay */}
        {gameState.gameStatus !== 'playing' && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center rounded-lg">
            <div className="bg-gray-800/90 p-8 rounded-xl border border-gray-600 backdrop-blur-sm">
              {getStatusText()}
            </div>
          </div>
        )}
      </div>

      {/* Mobile Instructions */}
      <div className="text-center text-sm text-gray-400 md:hidden">
        <p>Swipe to change direction • Tap to pause/start</p>
      </div>

      {/* Desktop Instructions */}
      <div className="text-center text-sm text-gray-400 hidden md:block">
        <p>Arrow Keys or WASD to move • SPACE to pause • ENTER to start</p>
      </div>
    </div>
  )
}

export default SnakeGame