import { type QrFormErrors } from '../types/qr'

export type ValidatableForm = {
  text: string
  color: string
  background: string
  size: number
  format: string
  errorCorrectionLevel: string
  margin: number
}

const HEX_RE = /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/

export const validateQrForm = (form: ValidatableForm): QrFormErrors => {
  const errors: QrFormErrors = {}

  if (!form.text.trim()) {
    errors.data = 'Content is required'
  } else if (form.text.length > 2000) {
    errors.data = 'Max 2000 characters'
  }

  if (!HEX_RE.test(form.color)) {
    errors.color = 'Must be a valid hex color'
  }

  if (!HEX_RE.test(form.background)) {
    errors.background = 'Must be a valid hex color'
  }

  if (form.size < 100 || form.size > 1000) {
    errors.size = 'Size must be 100–1000'
  }

  if (!['png', 'svg', 'base64'].includes(form.format)) {
    errors.format = 'Invalid format'
  }

  if (!['L', 'M', 'Q', 'H'].includes(form.errorCorrectionLevel)) {
    errors.errorCorrectionLevel = 'Invalid error correction level'
  }

  if (form.margin < 0 || form.margin > 10) {
    errors.margin = 'Margin must be 0–10'
  }

  return errors
}

export const isFormValid = (errors: QrFormErrors): boolean =>
  Object.keys(errors).length === 0
