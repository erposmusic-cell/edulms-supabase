declare module 'pdfkit' {
  import { Stream } from 'stream'

  interface PDFDocumentOptions {
    size?: string | [number, number]
    margins?: number | { top?: number; bottom?: number; left?: number; right?: number }
    info?: Record<string, string>
    bufferPages?: boolean
    layout?: 'portrait' | 'landscape'
  }

  class PDFDocument extends Stream {
    constructor(options?: PDFDocumentOptions)
    pipe(destination: NodeJS.WritableStream): NodeJS.WritableStream
    end(): void
    on(event: 'data', listener: (chunk: Buffer) => void): this
    on(event: 'end', listener: () => void): this
    on(event: string, listener: Function): this
    fontSize(size: number): this
    font(name: string, family?: string): this
    fillColor(color: string): this
    text(text: string, x?: number | { align?: string; width?: number }, y?: number, options?: { width?: number; align?: string; lineGap?: number }): this
    rect(x: number, y: number, width: number, height: number): this
    fill(color?: string): this
    stroke(): this
    fillAndStroke(fillColor: string, strokeColor: string): this
    lineCap(style: string): this
    lineWidth(width: number): this
    moveTo(x: number, y: number): this
    lineTo(x: number, y: number): this
    save(): this
    restore(): this
    image(src: string | Buffer, x?: number, y?: number, options?: { width?: number; height?: number; fit?: [number, number] }): this
    addPage(options?: PDFDocumentOptions): this
    moveDown(lines?: number): this
    widthOfString(text: string, options?: { width?: number }): number
    heightOfString(text: string, options?: { width?: number; align?: string }): number
    x: number
    y: number
    page: { width: number; height: number; margins: { top: number; bottom: number; left: number; right: number } }
  }

  export default PDFDocument
}
