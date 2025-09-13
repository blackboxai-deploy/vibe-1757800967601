// Game constants and utilities
export const GAME_CONFIG = {
  BOARD_WIDTH: 40,
  BOARD_HEIGHT: 30,
  CELL_SIZE: 20,
  INITIAL_SPEED: 150, // ms between moves
  MIN_SPEED: 80,
  SPEED_INCREASE: 5, // decrease interval by 5ms
  POINTS_PER_FOOD: 10,
  SPEED_INCREASE_INTERVAL: 50, // increase speed every 50 points
}

export interface Position {
  x: number
  y: number
}

export interface GameState {
  snake: Position[]
  direction: Direction
  food: Position
  score: number
  highScore: number
  gameStatus: 'menu' | 'playing' | 'paused' | 'gameOver'
  speed: number
}

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'

export const DIRECTIONS = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
}

export const getOppositeDirection = (direction: Direction): Direction => {
  const opposites: Record<Direction, Direction> = {
    UP: 'DOWN',
    DOWN: 'UP',
    LEFT: 'RIGHT',
    RIGHT: 'LEFT',
  }
  return opposites[direction]
}

export const generateFood = (snake: Position[]): Position => {
  let food: Position
  let attempts = 0
  const maxAttempts = 100

  do {
    food = {
      x: Math.floor(Math.random() * GAME_CONFIG.BOARD_WIDTH),
      y: Math.floor(Math.random() * GAME_CONFIG.BOARD_HEIGHT),
    }
    attempts++
  } while (
    snake.some(segment => segment.x === food.x && segment.y === food.y) &&
    attempts < maxAttempts
  )

  return food
}

export const moveSnake = (snake: Position[], direction: Direction): Position[] => {
  const head = { ...snake[0] }
  const directionVector = DIRECTIONS[direction]
  
  head.x += directionVector.x
  head.y += directionVector.y

  return [head, ...snake.slice(0, -1)]
}

export const checkCollision = (head: Position, snake: Position[]): boolean => {
  // Wall collision
  if (
    head.x < 0 ||
    head.x >= GAME_CONFIG.BOARD_WIDTH ||
    head.y < 0 ||
    head.y >= GAME_CONFIG.BOARD_HEIGHT
  ) {
    return true
  }

  // Self collision (check against body, not head)
  return snake.slice(1).some(segment => segment.x === head.x && segment.y === head.y)
}

export const checkFoodCollision = (head: Position, food: Position): boolean => {
  return head.x === food.x && head.y === food.y
}

export const calculateSpeed = (score: number): number => {
  const speedReduction = Math.floor(score / GAME_CONFIG.SPEED_INCREASE_INTERVAL) * GAME_CONFIG.SPEED_INCREASE
  return Math.max(GAME_CONFIG.MIN_SPEED, GAME_CONFIG.INITIAL_SPEED - speedReduction)
}

export const getStoredHighScore = (): number => {
  if (typeof window === 'undefined') return 0
  try {
    return parseInt(localStorage.getItem('snakeHighScore') || '0', 10)
  } catch {
    return 0
  }
}

export const saveHighScore = (score: number): void => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem('snakeHighScore', score.toString())
  } catch {
    // Silently fail if localStorage is not available
  }
}

export const initializeGameState = (): GameState => {
  const initialSnake: Position[] = [
    { x: Math.floor(GAME_CONFIG.BOARD_WIDTH / 2), y: Math.floor(GAME_CONFIG.BOARD_HEIGHT / 2) }
  ]
  
  return {
    snake: initialSnake,
    direction: 'RIGHT',
    food: generateFood(initialSnake),
    score: 0,
    highScore: getStoredHighScore(),
    gameStatus: 'menu',
    speed: GAME_CONFIG.INITIAL_SPEED,
  }
}