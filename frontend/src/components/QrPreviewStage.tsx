import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Stage, Layer, Image as KonvaImage, Rect, Transformer } from 'react-konva'
import type Konva from 'konva'

export const STAGE_SIZE = 320

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
        setSelected(false)
        return stageRef.current.toDataURL({ pixelRatio: scale })
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
          if (e.target === e.target.getStage()) setSelected(false)
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
                onMouseDown={() => setSelected(true)}
                onTap={() => setSelected(true)}
                onDragEnd={(e) => {
                  setLogoPos({ x: e.target.x(), y: e.target.y() })
                }}
                onTransformEnd={() => {
                  const node = logoNodeRef.current!
                  const newW = Math.max(20, node.width() * node.scaleX())
                  const newH = Math.max(20, node.height() * node.scaleY())
                  node.scaleX(1)
                  node.scaleY(1)
                  setLogoPos({ x: node.x(), y: node.y() })
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
