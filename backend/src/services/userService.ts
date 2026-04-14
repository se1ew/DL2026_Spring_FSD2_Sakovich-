import { prisma } from '../lib/prisma'

export type CreateUserPayload = {
  email: string
  passwordHash: string
}

export const userService = {
  async findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } })
  },

  async findById(id: string) {
    return prisma.user.findUnique({ where: { id } })
  },

  async create(payload: CreateUserPayload) {
    return prisma.user.create({
      data: {
        email: payload.email,
        passwordHash: payload.passwordHash,
      },
    })
  },
}
