import { Request, Response, NextFunction } from 'express'
import QRCode from 'qrcode'
import { qrService } from '../services/qrService'
import { QrRequest } from '../types/qr'

const buildQrOptions = (body: QrRequest): QRCode.QRCodeToDataURLOptions => {
  return {
    width: body.size,
    margin: body.margin,
    errorCorrectionLevel: body.errorCorrectionLevel,
    color: {
      dark: body.color,
      light: body.background,
    },
  }
}

export const createQr = async (
  req: Request<object, unknown, QrRequest>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      res.status(401).json({ error: 'Не авторизован' })
      return
    }

    const { text, format } = req.body
    const options = buildQrOptions(req.body)

    let imageData: string
    let mimeType: string

    if (format === 'svg') {
      imageData = await QRCode.toString(text, { ...options, type: 'svg' })
      mimeType = 'image/svg+xml'
    } else {
      imageData = await QRCode.toDataURL(text, options)
      mimeType = 'image/png'
    }

    const qr = await qrService.create({
      data: text,
      color: req.body.color,
      background: req.body.background,
      size: req.body.size,
      format,
      errorCorrectionLevel: req.body.errorCorrectionLevel,
      margin: req.body.margin,
      imageUrl: imageData,
      userId,
    })

    res.status(201).json({
      qr,
      image: imageData,
      mimeType,
    })
  } catch (err) {
    next(err)
  }
}

export const listQr = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      res.status(401).json({ error: 'Не авторизован' })
      return
    }

    const items = await qrService.list(userId)
    res.json({ items })
  } catch (err) {
    next(err)
  }
}

export const getQrById = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      res.status(401).json({ error: 'Не авторизован' })
      return
    }

    const qr = await qrService.getById(req.params.id, userId)

    if (!qr) {
      res.status(404).json({ error: 'QR code not found' })
      return
    }

    res.json(qr)
  } catch (err) {
    next(err)
  }
}
