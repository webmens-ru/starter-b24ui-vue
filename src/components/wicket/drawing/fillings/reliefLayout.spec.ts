import { describe, expect, it } from 'vitest'
import { imageDimensions, reliefLayout, svgDimensions } from './reliefLayout'

describe('uploaded relief units', () => {
  it('isolates malformed and external sources without rejecting the live preview', async () => {
    expect(await imageDimensions('http://[bad', new AbortController().signal)).toBeNull()
    expect(await imageDimensions('https://external.invalid/relief.svg', new AbortController().signal)).toBeNull()
  })
  it.each([
    ['stretch', 'stretch', 700, 1500],
    ['stretch', 'repeat', 80, 1500],
    ['repeat', 'stretch', 700, 200],
    ['repeat', 'repeat', 80, 200],
  ] as const)('%s along / %s across', (along, across, width, height) => {
    expect(reliefLayout({ width: 700, height: 1500 }, { width: 80, height: 200 }, 'vertical', along, across)).toEqual({ width, height })
  })
  it('rotates material axes for horizontal direction', () => {
    expect(reliefLayout({ width: 700, height: 1500 }, { width: 80, height: 200 }, 'horizontal', 'stretch', 'stretch')).toEqual({ width: 1500, height: 700 })
    expect(reliefLayout({ width: 700, height: 1500 }, { width: 80, height: 200 }, 'horizontal', 'stretch', 'repeat')).toEqual({ width: 80, height: 700 })
    expect(reliefLayout({ width: 700, height: 1500 }, { width: 80, height: 200 }, 'horizontal', 'repeat', 'stretch')).toEqual({ width: 1500, height: 200 })
    expect(reliefLayout({ width: 700, height: 1500 }, { width: 80, height: 200 }, 'horizontal', 'repeat', 'repeat')).toEqual({ width: 80, height: 200 })
  })
  it('reads actual SVG dimensions, including viewBox-only uploads', () => {
    expect(svgDimensions('<svg viewBox="0 0 80 200"/>')).toEqual({ width: 80, height: 200 })
    expect(svgDimensions('<svg width="40" height="120" viewBox="0 0 80 200"/>')).toEqual({ width: 40, height: 120 })
    expect(svgDimensions('<svg width="100%" height="100%" viewBox="0 0 80 200"/>')).toEqual({ width: 80, height: 200 })
  })
})
