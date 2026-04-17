import { QrRequestSchema } from '../types/qr'
import { RegisterSchema } from '../types/auth'

describe('QrRequestSchema', () => {
  it('accepts valid minimal input', () => {
    const result = QrRequestSchema.safeParse({ text: 'hello' })
    expect(result.success).toBe(true)
  })

  it('applies defaults for optional fields', () => {
    const result = QrRequestSchema.safeParse({ text: 'hello' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.format).toBe('png')
      expect(result.data.errorCorrectionLevel).toBe('M')
      expect(result.data.margin).toBe(2)
      expect(result.data.size).toBe(300)
      expect(result.data.color).toBe('#000000')
      expect(result.data.background).toBe('#ffffff')
    }
  })

  it('rejects empty text', () => {
    const result = QrRequestSchema.safeParse({ text: '' })
    expect(result.success).toBe(false)
  })

  it('rejects text longer than 2000 chars', () => {
    const result = QrRequestSchema.safeParse({ text: 'a'.repeat(2001) })
    expect(result.success).toBe(false)
  })

  it('rejects invalid color format', () => {
    const result = QrRequestSchema.safeParse({ text: 'hi', color: 'red' })
    expect(result.success).toBe(false)
  })

  it('accepts valid 6-digit hex color', () => {
    const result = QrRequestSchema.safeParse({ text: 'hi', color: '#aabbcc' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid error correction level', () => {
    const result = QrRequestSchema.safeParse({ text: 'hi', errorCorrectionLevel: 'X' })
    expect(result.success).toBe(false)
  })

  it('rejects size outside allowed range', () => {
    expect(QrRequestSchema.safeParse({ text: 'hi', size: 50 }).success).toBe(false)
    expect(QrRequestSchema.safeParse({ text: 'hi', size: 1001 }).success).toBe(false)
  })
})

describe('RegisterSchema', () => {
  it('accepts valid credentials', () => {
    const result = RegisterSchema.safeParse({ email: 'user@example.com', password: 'secret123' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email', () => {
    const result = RegisterSchema.safeParse({ email: 'not-an-email', password: 'secret123' })
    expect(result.success).toBe(false)
  })

  it('rejects short password', () => {
    const result = RegisterSchema.safeParse({ email: 'user@example.com', password: '123' })
    expect(result.success).toBe(false)
  })
})
