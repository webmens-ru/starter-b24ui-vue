import { describe, expect, it } from 'vitest'

import { resolveDrawingComponent } from './drawingRegistry'

describe('resolveDrawingComponent', () => {
  it('возвращает отдельный компонент для типа 2', () => {
    expect(resolveDrawingComponent('2')).not.toBeNull()
  })

  it('не подставляет чертёж другого типа', () => {
    expect(resolveDrawingComponent('1')).toBeNull()
    expect(resolveDrawingComponent('11')).toBeNull()
  })
})
