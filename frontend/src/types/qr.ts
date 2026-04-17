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
  dynamicUrl?: string | null
  projectId?: string | null
  createdAt: string
}

export type Project = {
  id: string
  name: string
  createdAt: string
  _count?: { qrCodes: number }
}

export type QrFormFields = Omit<QrHistoryItem, 'id' | 'createdAt' | 'imageUrl'>

export type ErrorCorrectionLabels = Record<'L' | 'M' | 'Q' | 'H', string>

export type QrFormErrors = Partial<Record<keyof QrFormFields, string>>
