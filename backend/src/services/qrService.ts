import type { QrCode } from '@prisma/client'
import { redis, buildHistoryCacheKey } from '../lib/redis'
import { prisma } from '../lib/prisma'

export type CreateQrPayload = {
  data: string
  color: string
  background: string
  size: number
  format: string
  errorCorrectionLevel?: string
  margin?: number
  imageUrl: string
  userId: string
}

const HISTORY_TTL_SECONDS = Number(process.env.REDIS_HISTORY_TTL ?? '60')

const safeParseHistory = (raw: string | null): QrCode[] | null => {
  if (!raw) return null
  try {
    return JSON.parse(raw) as QrCode[]
  } catch {
    return null
  }
}

const getCacheKey = (userId: string) => buildHistoryCacheKey(userId)

const readCachedHistory = async (userId: string): Promise<QrCode[] | null> => {
  const cacheKey = getCacheKey(userId)
  try {
    const cached = await redis.get(cacheKey)
    const parsed = safeParseHistory(cached)
    if (!parsed && cached) {
      await redis.del(cacheKey)
    }
    return parsed
  } catch {
    return null
  }
}

const cacheHistory = async (userId: string, items: QrCode[]): Promise<void> => {
  try {
    await redis.set(getCacheKey(userId), JSON.stringify(items), 'EX', HISTORY_TTL_SECONDS)
  } catch {
    // cache is optional
  }
}

const invalidateHistoryCache = async (userId: string): Promise<void> => {
  try {
    await redis.del(getCacheKey(userId))
  } catch {
    // cache is optional
  }
}

export const qrService = {
  async create(payload: CreateQrPayload) {
    const qr = await prisma.qrCode.create({
      data: {
        data: payload.data,
        color: payload.color,
        background: payload.background,
        size: payload.size,
        format: payload.format,
        errorCorrectionLevel: payload.errorCorrectionLevel,
        margin: payload.margin,
        imageUrl: payload.imageUrl,
        userId: payload.userId,
      },
    })

    void invalidateHistoryCache(payload.userId)

    return qr
  },

  async list(userId: string) {
    const cached = await readCachedHistory(userId)
    if (cached) {
      return cached
    }

    return prisma.qrCode.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    }).then((items) => {
      void cacheHistory(userId, items)
      return items
    })
  },

  async getById(id: string, userId: string) {
    return prisma.qrCode.findFirst({ where: { id, userId } })
  },

  async getByIdPublic(id: string) {
    return prisma.qrCode.findUnique({ where: { id } })
  },

  async incrementViews(id: string): Promise<number> {
    try {
      const count = await redis.incr(`qr:views:${id}`)
      return count
    } catch {
      return 0
    }
  },

  async getViews(id: string): Promise<number> {
    try {
      const val = await redis.get(`qr:views:${id}`)
      return val ? parseInt(val, 10) : 0
    } catch {
      return 0
    }
  },
}
