import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined')
}

type JwtPayload = {
  userId: string
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Не авторизован' })
    return
  }

  const token = authHeader.slice('Bearer '.length)

  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload
    req.user = { userId: payload.userId }
    next()
  } catch (error) {
    console.error('JWT verification failed', error)
    res.status(401).json({ error: 'Не авторизован' })
  }
}
