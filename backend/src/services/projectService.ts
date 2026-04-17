import { prisma } from '../lib/prisma'

export const projectService = {
  async list(userId: string) {
    return prisma.project.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { qrCodes: true } } },
    })
  },

  async create(userId: string, name: string) {
    return prisma.project.create({ data: { name, userId } })
  },

  async findById(id: string, userId: string) {
    return prisma.project.findFirst({ where: { id, userId } })
  },

  async deleteById(id: string, userId: string) {
    const project = await prisma.project.findFirst({ where: { id, userId } })
    if (!project) return null
    return prisma.project.delete({ where: { id } })
  },
}
