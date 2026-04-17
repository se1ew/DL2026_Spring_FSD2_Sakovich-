import { describe, it, expect } from 'vitest'
import { constrainLogoPos, STAGE_SIZE, CORNER_ZONE } from '../constrainLogoPos'

const S = STAGE_SIZE
const C = CORNER_ZONE

describe('constrainLogoPos', () => {
  it('keeps logo inside stage bounds', () => {
    const result = constrainLogoPos(-10, -10, 40, 40)
    expect(result.x).toBeGreaterThanOrEqual(0)
    expect(result.y).toBeGreaterThanOrEqual(0)
  })

  it('does not allow logo to exceed right/bottom edge', () => {
    const w = 40, h = 40
    const result = constrainLogoPos(S + 100, S + 100, w, h)
    expect(result.x).toBeLessThanOrEqual(S - w)
    expect(result.y).toBeLessThanOrEqual(S - h)
  })

  it('pushes logo out of top-left forbidden zone', () => {
    const result = constrainLogoPos(0, 0, 20, 20)
    const overlapsTopLeft = result.x < C && result.y < C
    expect(overlapsTopLeft).toBe(false)
  })

  it('pushes logo out of top-right forbidden zone', () => {
    const w = 20, h = 20
    const result = constrainLogoPos(S - w, 0, w, h)
    const overlapsTopRight = result.x + w > S - C && result.x < S && result.y < C
    expect(overlapsTopRight).toBe(false)
  })

  it('pushes logo out of bottom-left forbidden zone', () => {
    const w = 20, h = 20
    const result = constrainLogoPos(0, S - h, w, h)
    const overlapsBottomLeft = result.x < C && result.y + h > S - C
    expect(overlapsBottomLeft).toBe(false)
  })

  it('allows logo in center', () => {
    const w = 40, h = 40
    const cx = S / 2 - w / 2
    const cy = S / 2 - h / 2
    const result = constrainLogoPos(cx, cy, w, h)
    expect(result.x).toBe(cx)
    expect(result.y).toBe(cy)
  })
})
