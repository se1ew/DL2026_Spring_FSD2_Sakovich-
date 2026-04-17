import { describe, it, expect } from 'vitest'
import { validateQrForm, isFormValid } from '../validateQrForm'

const validForm = {
  text: 'https://example.com',
  color: '#000000',
  background: '#ffffff',
  size: 300,
  format: 'png',
  errorCorrectionLevel: 'M',
  margin: 2,
}

describe('validateQrForm', () => {
  it('returns no errors for a valid form', () => {
    const errors = validateQrForm(validForm)
    expect(isFormValid(errors)).toBe(true)
  })

  it('reports error when text is empty', () => {
    const errors = validateQrForm({ ...validForm, text: '   ' })
    expect(errors.data).toBeDefined()
  })

  it('reports error when text exceeds 2000 chars', () => {
    const errors = validateQrForm({ ...validForm, text: 'a'.repeat(2001) })
    expect(errors.data).toBeDefined()
  })

  it('reports error for invalid hex color', () => {
    const errors = validateQrForm({ ...validForm, color: 'red' })
    expect(errors.color).toBeDefined()
  })

  it('accepts 3-digit hex color', () => {
    const errors = validateQrForm({ ...validForm, color: '#abc' })
    expect(errors.color).toBeUndefined()
  })

  it('reports error when size is out of range', () => {
    expect(validateQrForm({ ...validForm, size: 50 }).size).toBeDefined()
    expect(validateQrForm({ ...validForm, size: 1001 }).size).toBeDefined()
  })

  it('reports error when margin is out of range', () => {
    expect(validateQrForm({ ...validForm, margin: -1 }).margin).toBeDefined()
    expect(validateQrForm({ ...validForm, margin: 11 }).margin).toBeDefined()
  })

  it('reports error for invalid error correction level', () => {
    const errors = validateQrForm({ ...validForm, errorCorrectionLevel: 'X' })
    expect(errors.errorCorrectionLevel).toBeDefined()
  })
})

describe('isFormValid', () => {
  it('returns true for empty errors object', () => {
    expect(isFormValid({})).toBe(true)
  })

  it('returns false when any error present', () => {
    expect(isFormValid({ data: 'required' })).toBe(false)
  })
})
