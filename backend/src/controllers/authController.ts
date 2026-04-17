import { Request, Response, NextFunction } from 'express'
import bcrypt from 'bcryptjs'
import jwt, { type SignOptions } from 'jsonwebtoken'
import crypto from 'crypto'
import { userService } from '../services/userService'
import { LoginRequest, RegisterRequest } from '../types/auth'
import { requireEnv } from '../lib/env'
import { prisma } from '../lib/prisma'

const JWT_SECRET = requireEnv('JWT_SECRET')
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN ?? '7d') as SignOptions['expiresIn']

type JwtPayload = {
  userId: string
}

const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000

const buildToken = (userId: string) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

const createRefreshToken = async (userId: string): Promise<string> => {
  const token = crypto.randomBytes(40).toString('hex')
  const expiresAt = new Date(Date.now() + REFRESH_TTL_MS)
  await prisma.refreshToken.create({ data: { token, userId, expiresAt } })
  return token
}

const buildResponse = (user: { id: string; email: string }) => ({
  user: {
    id: user.id,
    email: user.email,
  },
})

export const register = async (
  req: Request<object, unknown, RegisterRequest>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email, password } = req.body

    const existing = await userService.findByEmail(email)
    if (existing) {
      res.status(409).json({ error: 'Пользователь с таким email уже существует' })
      return
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const user = await userService.create({ email, passwordHash })
    const token = buildToken(user.id)
    const refreshToken = await createRefreshToken(user.id)

    res.status(201).json({ token, refreshToken, ...buildResponse(user) })
  } catch (error) {
    next(error)
  }
}

export const login = async (
  req: Request<object, unknown, LoginRequest>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email, password } = req.body

    const user = await userService.findByEmail(email)
    if (!user) {
      res.status(401).json({ error: 'Неверный email или пароль' })
      return
    }

    const isValid = await bcrypt.compare(password, user.passwordHash)
    if (!isValid) {
      res.status(401).json({ error: 'Неверный email или пароль' })
      return
    }

    const token = buildToken(user.id)
    const refreshToken = await createRefreshToken(user.id)

    res.json({ token, refreshToken, ...buildResponse(user) })
  } catch (error) {
    next(error)
  }
}

export const refreshAccessToken = async (
  req: Request<object, unknown, { refreshToken: string }>,
  res: Response,
): Promise<void> => {
  const { refreshToken } = req.body
  if (!refreshToken) {
    res.status(400).json({ error: 'refreshToken required' })
    return
  }

  const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } })
  if (!stored || stored.expiresAt < new Date()) {
    res.status(401).json({ error: 'Invalid or expired refresh token' })
    return
  }

  await prisma.refreshToken.delete({ where: { id: stored.id } })
  const user = await userService.findById(stored.userId)
  if (!user) {
    res.status(401).json({ error: 'User not found' })
    return
  }

  const token = buildToken(user.id)
  const newRefreshToken = await createRefreshToken(user.id)
  res.json({ token, refreshToken: newRefreshToken, ...buildResponse(user) })
}

export const logout = async (
  req: Request<object, unknown, { refreshToken?: string }>,
  res: Response,
): Promise<void> => {
  const { refreshToken } = req.body
  if (refreshToken) {
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } }).catch(() => {})
  }
  res.json({ ok: true })
}

export const verifyToken = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Не авторизован' })
    return
  }

  const token = authHeader.split(' ')[1]

  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload
    const user = await userService.findById(payload.userId)

    if (!user) {
      res.status(401).json({ error: 'Не авторизован' })
      return
    }

    res.json({ token, ...buildResponse(user) })
  } catch {
    res.status(401).json({ error: 'Не авторизован' })
  }
}
