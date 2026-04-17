import { Router } from 'express'
import { createQr, deleteQr, getQrById, listQr, viewQrPublic } from '../controllers/qrController'
import { authMiddleware } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { noStore, publicShortCache } from '../middleware/cache'
import { QrRequestSchema } from '../types/qr'

export const router = Router()

router.get('/:id/view', publicShortCache, viewQrPublic)

router.use(authMiddleware)

router.post('/', noStore, validate(QrRequestSchema), createQr)
router.get('/', noStore, listQr)
router.get('/:id', noStore, getQrById)
router.delete('/:id', noStore, deleteQr)
