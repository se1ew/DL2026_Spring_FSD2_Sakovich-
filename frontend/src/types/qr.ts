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

export type QrFormFields = Omit<QrHistoryItem, 'id' | 'createdAt' | 'imageUrl'>

export type ErrorCorrectionLabels = Record<'L' | 'M' | 'Q' | 'H', string>

export type QrFormErrors = Partial<Record<keyof QrFormFields, string>>
