declare module 'qrcode' {
  export type QRCodeErrorCorrectionLevel =
    | 'low'
    | 'medium'
    | 'quartile'
    | 'high'
    | 'L'
    | 'M'
    | 'Q'
    | 'H'

  export interface QRCodeToDataURLOptions {
    version?: number
    errorCorrectionLevel?: QRCodeErrorCorrectionLevel
    type?: 'image/png' | 'image/jpeg' | 'image/webp'
    quality?: number
    margin?: number
    scale?: number
    small?: boolean
    width?: number
    color?: {
      dark?: string
      light?: string
    }
  }

  export interface QRCodeToStringOptions extends QRCodeToDataURLOptions {
    type?: string
  }

  export function toDataURL(text: string, options?: QRCodeToDataURLOptions): Promise<string>
  export function toString(text: string, options?: QRCodeToStringOptions): Promise<string>
}
