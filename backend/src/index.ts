import http from 'http'
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import morgan from 'morgan'
import helmet from 'helmet'
import { router as authRouter } from './routes/auth'
import { router as qrRouter } from './routes/qr'
import { router as projectsRouter } from './routes/projects'
import { redirectDynamic } from './controllers/qrController'
import { errorHandler } from './middleware/errorHandler'
import { initRealtime } from './lib/realtime'
import { noStore } from './middleware/cache'

dotenv.config()

const app = express()
const server = http.createServer(app)
const PORT = process.env.PORT || 3000

app.use(helmet())
app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173' }))
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))
app.use(express.json({ limit: '5mb' }))

app.get('/health', noStore, (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/auth', authRouter)
app.use('/api/qr', qrRouter)
app.use('/api/projects', projectsRouter)
app.get('/r/:id', redirectDynamic)

app.use(errorHandler)

initRealtime(server)

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})

export default app
