jest.mock('../lib/prisma', () => ({
  prisma: {
    qrCode: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
    },
  },
}))

jest.mock('../lib/redis', () => ({
  redis: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    keys: jest.fn().mockResolvedValue([]),
    incr: jest.fn().mockResolvedValue(1),
  },
  buildHistoryCacheKey: jest.fn(
    (userId: string, page: number, limit: number) => `qr:history:${userId}:p${page}:l${limit}`
  ),
  buildHistoryCachePattern: jest.fn((userId: string) => `qr:history:${userId}:*`),
}))

import { qrService } from '../services/qrService'
import { prisma } from '../lib/prisma'

const mockPrisma = prisma as jest.Mocked<typeof prisma>

const basePayload = {
  data: 'https://example.com',
  color: '#000000',
  background: '#ffffff',
  size: 300,
  format: 'png' as const,
  errorCorrectionLevel: 'M' as const,
  margin: 2,
  imageUrl: 'data:image/png;base64,abc',
  userId: 'user-1',
}

describe('qrService.create', () => {
  it('calls prisma.qrCode.create with correct data', async () => {
    const fakeQr = { id: 'qr-1', ...basePayload }
    mockPrisma.qrCode.create.mockResolvedValue(fakeQr as never)

    const result = await qrService.create(basePayload)

    expect(mockPrisma.qrCode.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ data: 'https://example.com', userId: 'user-1' }),
    })
    expect(result).toEqual(fakeQr)
  })
})

describe('qrService.list', () => {
  it('returns paginated result from prisma when cache is empty', async () => {
    const fakeItems = [{ id: 'qr-1', ...basePayload }]
    mockPrisma.qrCode.count.mockResolvedValue(1)
    mockPrisma.qrCode.findMany.mockResolvedValue(fakeItems as never)

    const result = await qrService.list('user-1', 1, 6)

    expect(result.items).toEqual(fakeItems)
    expect(result.total).toBe(1)
    expect(result.page).toBe(1)
    expect(result.totalPages).toBe(1)
  })

  it('calculates totalPages correctly', async () => {
    mockPrisma.qrCode.count.mockResolvedValue(13)
    mockPrisma.qrCode.findMany.mockResolvedValue([] as never)

    const result = await qrService.list('user-1', 1, 6)
    expect(result.totalPages).toBe(3)
  })
})

describe('qrService.deleteById', () => {
  it('returns null when QR not found', async () => {
    mockPrisma.qrCode.findFirst.mockResolvedValue(null)
    const result = await qrService.deleteById('no-such-id', 'user-1')
    expect(result).toBeNull()
    expect(mockPrisma.qrCode.delete).not.toHaveBeenCalled()
  })

  it('deletes and returns the QR when found', async () => {
    const fakeQr = { id: 'qr-1', ...basePayload }
    mockPrisma.qrCode.findFirst.mockResolvedValue(fakeQr as never)
    mockPrisma.qrCode.delete.mockResolvedValue(fakeQr as never)

    const result = await qrService.deleteById('qr-1', 'user-1')
    expect(result).toEqual(fakeQr)
    expect(mockPrisma.qrCode.delete).toHaveBeenCalledWith({ where: { id: 'qr-1' } })
  })
})
