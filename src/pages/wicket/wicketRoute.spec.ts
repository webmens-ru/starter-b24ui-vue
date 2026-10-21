import { describe, expect, it } from 'vitest'

import type { WicketSharedNavState } from './wicketNavTypes'
import { defineWicketRoute, type WicketRouteSection } from './wicketRoute'
import { standardTailSections } from './wicketRouteSections'

const state: WicketSharedNavState = {
  modelId: '3',
  materialFacadeGlob: 'Штакетник',
  fillSide: 'Одна сторона',
  materialYardGlob: null,
  isThereLock: 0,
  providesLock: 'Предоставляет изготовитель',
  availableSections: [],
}

function section(page: string, pages = [page]): WicketRouteSection {
  return {
    menu: { page, label: page, url: page },
    pages,
    visible: () => true,
    validate: () => ({ valid: true, errors: [] }),
  }
}

describe('defineWicketRoute', () => {
  it('orders canvas, shield and painting as separate consecutive sections', () => {
    const route = defineWicketRoute(standardTailSections())
    expect(route.menu(state).map(item => item.label)).toEqual([
      'Столбы / Вариант открытия / Перемычка', 'Расположение полотна', 'Тип щита',
      'Окраска', 'Комплект замка', 'Дополнительная ручка', 'Рассчитать',
    ])
    expect(route.next('page6', state)).toBe('page3')
    expect(route.next('page3', state)).toBe('page_painting')
    expect(route.prev('page9', state)).toBe('page_painting')
  })
  it('строит меню и линейные переходы из одного массива разделов', () => {
    const route = defineWicketRoute([
      section('page1'),
      section('page7'),
      section('page2', ['page2', 'page2_facade']),
    ])

    expect(route.menu(state).map(item => item.page)).toEqual(['page1', 'page7', 'page2'])
    expect(route.next('page1', state)).toBe('page7')
    expect(route.prev('page2', state)).toBe('page7')
  })

  it('использует внутренние переходы раздела до перехода между разделами', () => {
    const fill = section('page2', ['page2', 'page2_facade'])
    fill.next = from => from === 'page2' ? 'page2_facade' : undefined
    fill.prev = from => from === 'page2_facade' ? 'page2' : undefined
    const route = defineWicketRoute([section('page7'), fill, section('page5')])

    expect(route.next('page2', state)).toBe('page2_facade')
    expect(route.next('page2_facade', state)).toBe('page5')
    expect(route.prev('page2_facade', state)).toBe('page2')
  })

  it('пропускает невидимые разделы', () => {
    const addon = section('page_addon')
    addon.visible = () => false
    const route = defineWicketRoute([section('page9'), addon, section('page10')])

    expect(route.next('page9', state)).toBe('page10')
    expect(route.menu(state).map(item => item.page)).toEqual(['page9', 'page10'])
  })

  it('исключает самостоятельные аксессуары из стандартного хвоста калитки', () => {
    const route = defineWicketRoute(standardTailSections())
    const menuPages = route.menu(state).map(item => item.page)

    expect(menuPages).not.toEqual(expect.arrayContaining([
      'page_lock_components',
      'page_door_closer',
      'page_bumper',
      'page_skud',
    ]))
    expect(menuPages).toEqual(expect.arrayContaining(['page9', 'page10']))
    expect(route.next('page9', { ...state, isThereLock: 0 })).toBe('page10')
    const stateWithLock = { ...state, isThereLock: 1 }
    expect(route.next('page_lock_type', stateWithLock)).toBe('page10')
    expect(route.prev('page10', stateWithLock)).toBe('page_lock_type')
    expect(route.next('page10', state)).toBe('page12')
    expect(route.prev('page12', state)).toBe('page10')
    expect(menuPages).not.toContain('page11')
  })
})
