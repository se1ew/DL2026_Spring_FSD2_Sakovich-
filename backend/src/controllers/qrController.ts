import { Request, Response, NextFunction } from 'express'
import QRCode from 'qrcode'
import { QrRequest } from '../types/qr'

export const generateQr = async (
  req: Request<object, unknown, QrRequest>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { text, size, format, errorCorrectionLevel, margin } = req.body

    const opts: QRCode.QRCodeToBufferOptions & QRCode.QRCodeToStringOptions = {
      width: size,
      margin,
      errorCorrectionLevel,
    }

    if (format === 'svg') {
      const svg = await QRCode.toString(text, { ...opts, type: 'svg' })
      res.setHeader('Content-Type', 'image/svg+xml')
      res.send(svg)
      return
    }

    if (format === 'base64') {
      const dataUrl = await QRCode.toDataURL(text, opts)
      res.json({ data: dataUrl, format: 'base64' })
      return
    }

    const buffer = await QRCode.toBuffer(text, opts)
    res.setHeader('Content-Type', 'image/png')
    res.send(buffer)
  } catch (err) {
    next(err)
  }
}
