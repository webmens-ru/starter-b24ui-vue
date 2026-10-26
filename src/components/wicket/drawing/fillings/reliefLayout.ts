import type { FillingDirection } from './fillingDrawingTypes'

export type ReliefMode = 'stretch' | 'repeat'
export interface ImageDimensions { width: number; height: number }

export function reliefLayout(area: ImageDimensions, source: ImageDimensions, direction: FillingDirection, along: ReliefMode, across: ReliefMode): ImageDimensions {
  const localWidth = direction === 'vertical' ? area.width : area.height
  const localHeight = direction === 'vertical' ? area.height : area.width
  return { width: across === 'stretch' ? localWidth : source.width, height: along === 'stretch' ? localHeight : source.height }
}

export function svgDimensions(source: string): ImageDimensions | null {
  const root = new DOMParser().parseFromString(source, 'image/svg+xml').documentElement
  if (root.localName !== 'svg') return null
  const length = (value: string | null): number => value && /^\d+(?:\.\d+)?(?:px)?$/.test(value.trim()) ? parseFloat(value) : 0
  const viewBox = (root.getAttribute('viewBox') ?? '').trim().split(/[\s,]+/).map(Number)
  const width = length(root.getAttribute('width')) || (viewBox.length === 4 ? viewBox[2] : 0)
  const height = length(root.getAttribute('height')) || (viewBox.length === 4 ? viewBox[3] : 0)
  return width && height && Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0 ? { width, height } : null
}

/** Read only same-origin uploaded sources. SVG markup is parsed as inert XML, never injected. */
export async function imageDimensions(source: string, signal: AbortSignal): Promise<ImageDimensions | null> {
  try {
    const url = new URL(source, window.location.href)
    if (url.origin !== window.location.origin || !['http:', 'https:'].includes(url.protocol)) return null
    const response = await fetch(url.href, { signal, credentials: 'same-origin' })
    if (!response.ok) return null
    const blob = await response.blob()
    if (blob.type.includes('svg') || url.pathname.toLowerCase().endsWith('.svg')) return svgDimensions(await blob.text())
    return await new Promise(resolve => {
      if (signal.aborted) { resolve(null); return }
      const image = new Image()
      const objectUrl = URL.createObjectURL(blob)
      const abort = () => { image.src = ''; done(null) }
      const done = (value: ImageDimensions | null) => { signal.removeEventListener('abort', abort); URL.revokeObjectURL(objectUrl); resolve(value) }
      signal.addEventListener('abort', abort, { once: true })
      image.onload = () => done(image.naturalWidth > 0 && image.naturalHeight > 0 ? { width: image.naturalWidth, height: image.naturalHeight } : null)
      image.onerror = () => done(null)
      image.src = objectUrl
    })
  } catch { return null }
}
