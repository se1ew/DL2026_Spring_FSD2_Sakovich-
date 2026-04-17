export const STAGE_SIZE = 320
export const CORNER_ZONE = Math.round(STAGE_SIZE * 0.26)

type Dir = 'right' | 'left' | 'up' | 'down'

export const constrainLogoPos = (
  x: number,
  y: number,
  w: number,
  h: number,
  stageSize = STAGE_SIZE,
  cornerZone = CORNER_ZONE,
) => {
  const S = stageSize
  const C = cornerZone

  let nx = Math.max(0, Math.min(x, S - w))
  let ny = Math.max(0, Math.min(y, S - h))

  const forbidden: { x1: number; y1: number; x2: number; y2: number; dirs: Dir[] }[] = [
    { x1: 0,   y1: 0,   x2: C,   y2: C,   dirs: ['right', 'down'] },
    { x1: S-C, y1: 0,   x2: S,   y2: C,   dirs: ['left',  'down'] },
    { x1: 0,   y1: S-C, x2: C,   y2: S,   dirs: ['right', 'up']   },
  ]

  for (const z of forbidden) {
    if (nx < z.x2 && nx + w > z.x1 && ny < z.y2 && ny + h > z.y1) {
      let best = Infinity
      let bnx = nx, bny = ny

      for (const d of z.dirs) {
        if (d === 'right') { const v = z.x2 - nx;       if (v < best) { best = v; bnx = z.x2;     bny = ny } }
        if (d === 'left')  { const v = nx + w - z.x1;   if (v < best) { best = v; bnx = z.x1 - w; bny = ny } }
        if (d === 'down')  { const v = z.y2 - ny;       if (v < best) { best = v; bnx = nx; bny = z.y2 } }
        if (d === 'up')    { const v = ny + h - z.y1;   if (v < best) { best = v; bnx = nx; bny = z.y1 - h } }
      }

      nx = bnx
      ny = bny
    }
  }

  return { x: nx, y: ny }
}
