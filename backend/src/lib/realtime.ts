import type { Server as HttpServer } from 'http'
import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'
import { requireEnv } from './env'

let io: Server | null = null

const roomForUser = (userId: string) => `user:${userId}`

export const QR_CREATED_EVENT = 'qr:created'
export const QR_VIEWED_EVENT = 'qr:viewed'

type JwtPayload = {
  userId: string
}

export const initRealtime = (server: HttpServer): Server => {
  const JWT_SECRET = requireEnv('JWT_SECRET')

  io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN ?? '*',
      methods: ['GET', 'POST'],
    },
  })

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token
    if (!token) {
      next(new Error('Unauthorized'))
      return
    }

    try {
      const payload = jwt.verify(token, JWT_SECRET) as JwtPayload
      socket.data.userId = payload.userId
      next()
    } catch {
      next(new Error('Unauthorized'))
    }
  })

  io.on('connection', (socket) => {
    const userId = socket.data.userId
    if (typeof userId === 'string') {
      socket.join(roomForUser(userId))
    }
  })

  return io
}

const getIo = (): Server => {
  if (!io) {
    throw new Error('Realtime server is not initialized')
  }
  return io
}

export const emitQrCreated = (userId: string, payload: unknown): void => {
  try {
    getIo().to(roomForUser(userId)).emit(QR_CREATED_EVENT, payload)
  } catch (error) {
    console.error('Failed to emit QR event', error)
  }
}

export const emitQrViewed = (userId: string, payload: unknown): void => {
  try {
    getIo().to(roomForUser(userId)).emit(QR_VIEWED_EVENT, payload)
  } catch (error) {
    console.error('Failed to emit QR viewed event', error)
  }
}
