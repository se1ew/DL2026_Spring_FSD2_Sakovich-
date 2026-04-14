import Redis from 'ioredis'

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379'

export const redis = new Redis(redisUrl)

redis.on('error', (error) => {
  console.error('Redis connection error', error)
})

export const buildHistoryCacheKey = (userId: string): string => `qr:history:${userId}`
