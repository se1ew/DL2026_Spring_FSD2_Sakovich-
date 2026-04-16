import { Router } from 'express'
import { createQr, getQrById, listQr, viewQrPublic } from '../controllers/qrController'
import { authMiddleware } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { QrRequestSchema } from '../types/qr'

export const router = Router()

router.get('/:id/view', viewQrPublic)

router.use(authMiddleware)

router.post('/', validate(QrRequestSchema), createQr)
router.get('/', listQr)
router.get('/:id', getQrById)
