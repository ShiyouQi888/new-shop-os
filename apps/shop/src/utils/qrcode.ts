/**
 * 二维码生成（纯 ESM，无 CJS interop 依赖）
 * qrcode-core.mjs 由 esbuild 从 qrcode/lib/core 打包生成，default 导出模块对象（含 create）。
 */
import qrcodeCore from './qrcode-core.mjs'

export interface QRModules {
  size: number
  get(row: number, col: number): boolean
}

export interface QRResult {
  modules: QRModules
  version: number
}

/** 生成二维码矩阵（无 canvas 依赖） */
export function createQR(text: string, opts: { errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'; margin?: number } = {}): QRResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const core = qrcodeCore as any
  const createFn = core.create || core.default?.create || core
  if (typeof createFn !== 'function') {
    throw new Error('二维码模块加载异常')
  }
  return createFn(text, opts) as QRResult
}

/** 生成推广二维码 SVG dataURL */
export function generateQRSvgDataUrl(text: string): string {
  const qr = createQR(text, { errorCorrectionLevel: 'M', margin: 1 })
  const size = qr.modules.size
  const cell = 4
  const pad = 8
  const total = size * cell + pad * 2
  let rects = ''
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (qr.modules.get(r, c)) {
        rects += `<rect x="${pad + c * cell}" y="${pad + r * cell}" width="${cell}" height="${cell}"/>`
      }
    }
  }
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="${total}" viewBox="0 0 ${total} ${total}"><rect width="100%" height="100%" fill="#ffffff"/><g fill="#171A1F">${rects}</g></svg>`,
  )}`
}
