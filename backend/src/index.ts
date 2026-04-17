import http from 'http'
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { router as authRouter } from './routes/auth'
import { router as qrRouter } from './routes/qr'
import { errorHandler } from './middleware/errorHandler'
import { initRealtime } from './lib/realtime'

dotenv.config()

const app = express()
const server = http.createServer(app)
const PORT = process.env.PORT || 3000

app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173' }))
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/auth', authRouter)
app.use('/api/qr', qrRouter)

app.use(errorHandler)

initRealtime(server)

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})

export default app
