import Redis from 'ioredis'

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379'

export const redis = new Redis(redisUrl)

redis.on('error', (error) => {
  console.error('Redis connection error', error)
})

export const buildHistoryCacheKey = (userId: string, page: number, limit: number): string =>
  `qr:history:${userId}:p${page}:l${limit}`

export const buildHistoryCachePattern = (userId: string): string => `qr:history:${userId}:*`
