import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Stage, Layer, Image as KonvaImage, Rect, Transformer } from 'react-konva'
import type Konva from 'konva'

export const STAGE_SIZE = 320

const CORNER_ZONE = Math.round(STAGE_SIZE * 0.26)

const constrainLogoPos = (x: number, y: number, w: number, h: number) => {
  const S = STAGE_SIZE
  const C = CORNER_ZONE

  let nx = Math.max(0, Math.min(x, S - w))
  let ny = Math.max(0, Math.min(y, S - h))

  const forbidden = [
    { x1: 0,   y1: 0,   x2: C,   y2: C   },
    { x1: S-C, y1: 0,   x2: S,   y2: C   },
    { x1: 0,   y1: S-C, x2: C,   y2: S   },
  ]

  for (const z of forbidden) {
    if (nx < z.x2 && nx + w > z.x1 && ny < z.y2 && ny + h > z.y1) {
      const pushRight = z.x2 - nx
      const pushDown  = z.y2 - ny
      const pushLeft  = (nx + w) - z.x1
      const pushUp    = (ny + h) - z.y1
      const min = Math.min(pushRight, pushDown, pushLeft, pushUp)
      if      (min === pushRight) nx = z.x2
      else if (min === pushDown)  ny = z.y2
      else if (min === pushLeft)  nx = z.x1 - w
      else                        ny = z.y1 - h
    }
  }

  return { x: nx, y: ny }
}

export type QrPreviewStageHandle = {
  toDataURL: (scale?: number) => string | null
}

type Props = {
  qrDataUrl: string | null
  logoDataUrl: string | null
}

function useImage(src: string | null): HTMLImageElement | null {
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  useEffect(() => {
    if (!src) { setImg(null); return }
    const el = new window.Image()
    el.onload = () => setImg(el)
    el.src = src
  }, [src])
  return img
}

export const QrPreviewStage = forwardRef<QrPreviewStageHandle, Props>(
  ({ qrDataUrl, logoDataUrl }, ref) => {
    const stageRef = useRef<Konva.Stage>(null)
    const logoNodeRef = useRef<Konva.Image>(null)
    const trRef = useRef<Konva.Transformer>(null)

    const qrImg = useImage(qrDataUrl)
    const logoImg = useImage(logoDataUrl)

    const [logoPos, setLogoPos] = useState({ x: 0, y: 0 })
    const [logoSize, setLogoSize] = useState({ width: 0, height: 0 })
    const [selected, setSelected] = useState(false)

    useEffect(() => {
      if (!logoImg) { setSelected(false); return }
      const size = Math.round(STAGE_SIZE * 0.22)
      setLogoPos({ x: (STAGE_SIZE - size) / 2, y: (STAGE_SIZE - size) / 2 })
      setLogoSize({ width: size, height: size })
    }, [logoImg])

    useEffect(() => {
      if (!trRef.current || !logoNodeRef.current) return
      if (selected) {
        trRef.current.nodes([logoNodeRef.current])
      } else {
        trRef.current.nodes([])
      }
      trRef.current.getLayer()?.batchDraw()
    }, [selected])

    useImperativeHandle(ref, () => ({
      toDataURL: (scale = 1) => {
        if (!stageRef.current) return null
        if (trRef.current) {
          trRef.current.visible(false)
          trRef.current.getLayer()?.batchDraw()
        }
        const url = stageRef.current.toDataURL({ pixelRatio: scale })
        if (trRef.current) {
          trRef.current.visible(true)
          trRef.current.getLayer()?.batchDraw()
        }
        return url
      },
    }))

    if (!qrImg) return null

    const bgPad = 6
    const bgX = logoPos.x - bgPad
    const bgY = logoPos.y - bgPad
    const bgW = logoSize.width + bgPad * 2
    const bgH = logoSize.height + bgPad * 2

    return (
      <Stage
        ref={stageRef}
        width={STAGE_SIZE}
        height={STAGE_SIZE}
        style={{ borderRadius: 8, overflow: 'hidden', cursor: 'default' }}
        onMouseDown={(e) => {
          if (e.target !== logoNodeRef.current) setSelected(false)
        }}
        onTouchStart={(e) => {
          if (e.target !== logoNodeRef.current) setSelected(false)
        }}
      >
        <Layer>
          <KonvaImage image={qrImg} width={STAGE_SIZE} height={STAGE_SIZE} />

          {logoImg && (
            <>
              <Rect x={bgX} y={bgY} width={bgW} height={bgH} fill="#ffffff" />
              <KonvaImage
                ref={logoNodeRef}
                image={logoImg}
                x={logoPos.x}
                y={logoPos.y}
                width={logoSize.width}
                height={logoSize.height}
                draggable
                dragBoundFunc={(pos) => constrainLogoPos(pos.x, pos.y, logoSize.width, logoSize.height)}
                onMouseDown={() => setSelected(true)}
                onTap={() => setSelected(true)}
                onDragEnd={(e) => {
                  const p = constrainLogoPos(e.target.x(), e.target.y(), logoSize.width, logoSize.height)
                  e.target.position(p)
                  setLogoPos(p)
                }}
                onTransformEnd={() => {
                  const node = logoNodeRef.current!
                  const newW = Math.max(20, node.width() * node.scaleX())
                  const newH = Math.max(20, node.height() * node.scaleY())
                  node.scaleX(1)
                  node.scaleY(1)
                  const p = constrainLogoPos(node.x(), node.y(), newW, newH)
                  node.position(p)
                  setLogoPos(p)
                  setLogoSize({ width: newW, height: newH })
                }}
              />
              {selected && (
                <Transformer
                  ref={trRef}
                  keepRatio
                  boundBoxFunc={(oldBox, newBox) =>
                    newBox.width < 20 || newBox.height < 20 ? oldBox : newBox
                  }
                />
              )}
            </>
          )}
        </Layer>
      </Stage>
    )
  },
)

QrPreviewStage.displayName = 'QrPreviewStage'
