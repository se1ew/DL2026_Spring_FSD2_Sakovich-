export type QrHistoryItem = {
  id: string
  data: string
  color: string
  background: string
  size: number
  format: string
  errorCorrectionLevel?: string | null
  margin?: number | null
  imageUrl: string
  createdAt: string
}
