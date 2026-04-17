import type { QrCode } from '@prisma/client'
import { redis, buildHistoryCacheKey, buildHistoryCachePattern } from '../lib/redis'
import { prisma } from '../lib/prisma'
import type { QrRequest } from '../types/qr'

export type CreateQrPayload = Omit<QrRequest, 'text' | 'precomposedImage'> & {
  data: string
  imageUrl: string
  userId: string
}

export type HistoryPage = {
  items: QrCode[]
  total: number
  page: number
  limit: number
  totalPages: number
}

const HISTORY_TTL_SECONDS = Number(process.env.REDIS_HISTORY_TTL ?? '60')

const readCachedPage = async (key: string): Promise<HistoryPage | null> => {
  try {
    const raw = await redis.get(key)
    if (!raw) return null
    return JSON.parse(raw) as HistoryPage
  } catch {
    return null
  }
}

const cachePage = async (key: string, page: HistoryPage): Promise<void> => {
  try {
    await redis.set(key, JSON.stringify(page), 'EX', HISTORY_TTL_SECONDS)
  } catch {
    // cache is optional
  }
}

const invalidateHistoryCache = async (userId: string): Promise<void> => {
  try {
    const pattern = buildHistoryCachePattern(userId)
    const keys = await redis.keys(pattern)
    if (keys.length > 0) await redis.del(...keys)
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

  async list(userId: string, page = 1, limit = 6): Promise<HistoryPage> {
    const cacheKey = buildHistoryCacheKey(userId, page, limit)
    const cached = await readCachedPage(cacheKey)
    if (cached) return cached

    const skip = (page - 1) * limit
    const [countResult, itemsResult] = await Promise.allSettled([
      prisma.qrCode.count({ where: { userId } }),
      prisma.qrCode.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ])

    const total = countResult.status === 'fulfilled' ? countResult.value : 0
    const items = itemsResult.status === 'fulfilled' ? itemsResult.value : []
    const result: HistoryPage = { items, total, page, limit, totalPages: Math.ceil(total / limit) }

    void cachePage(cacheKey, result)
    return result
  },

  async getById(id: string, userId: string) {
    return prisma.qrCode.findFirst({ where: { id, userId } })
  },

  async deleteById(id: string, userId: string) {
    const qr = await prisma.qrCode.findFirst({ where: { id, userId } })
    if (!qr) return null
    await prisma.qrCode.delete({ where: { id } })
    void invalidateHistoryCache(userId)
    return qr
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
