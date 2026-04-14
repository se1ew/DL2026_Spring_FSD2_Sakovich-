import { Request, Response } from 'express'

export const generateQr = (_req: Request, res: Response): void => {
  res.json({ message: 'QR generation endpoint — coming soon' })
}
