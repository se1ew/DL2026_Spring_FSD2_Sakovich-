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
}

export const qrService = {
  async create(payload: CreateQrPayload) {
    return prisma.qrCode.create({
      data: {
        data: payload.data,
        color: payload.color,
        background: payload.background,
        size: payload.size,
        format: payload.format,
        errorCorrectionLevel: payload.errorCorrectionLevel,
        margin: payload.margin,
        imageUrl: payload.imageUrl,
      },
    })
  },

  async list() {
    return prisma.qrCode.findMany({
      orderBy: { createdAt: 'desc' },
    })
  },

  async getById(id: string) {
    return prisma.qrCode.findUnique({ where: { id } })
  },
}
