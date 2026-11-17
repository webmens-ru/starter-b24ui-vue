import { describe, expect, it } from 'vitest'

import type { WicketSharedNavState } from './wicketNavTypes'
import { defineWicketRoute, type WicketRouteSection } from './wicketRoute'
import { shieldSection, canvasSection, fillingSection, standardTailSections } from './wicketRouteSections'

const state: WicketSharedNavState = {
  modelId: '3',
  materialFacadeGlob: 'Штакетник',
  fillSide: 1,
  materialYardGlob: null,
  isThereLock: 0,
  providesLock: 'Предоставляет изготовитель',
  availableSections: [],
}

const routes = import.meta.glob<Record<string, unknown>>('./type*Route.ts', { eager: true })

function section(page: string, pages = [page]): WicketRouteSection {
  return {
    menu: { page, label: page, url: page },
    pages,
    visible: () => true,
    validate: () => ({ valid: true, errors: [] }),
  }
}

describe('defineWicketRoute', () => {
  it.each(['1', '2', '4', '5', '6', '7', '8', '9', '10', '11'])('does not block model %s for a stale dirty flag', modelId => {
    const filling = fillingSection(['page2'], () => undefined, () => undefined, () => 'page2')
    const route = defineWicketRoute([filling, section('page_painting')])
    const stale = { ...state, modelId, fillingNeedsRecalculation: true, idFacade: 91 }
    expect(filling.validate(stale).valid).toBe(true)
    expect(route.canNavigate?.('page2', 'page_painting', stale)).toBe(true)
  })

  it.each(Object.entries(routes))('%s starts at opening and contains no manufacturing section', (_, module) => {
    const route = Object.values(module).find(value => typeof value === 'object' && value !== null && 'sections' in value) as ReturnType<typeof defineWicketRoute>
    expect(route.menu(state)[0]?.page).toBe('page7')
    expect(route.menu(state).map(item => item.page).slice(0, 5)).toEqual(['page7', 'page5', 'page3', 'page6', 'page2'])
    expect(route.next('page7', state)).toBe('page5')
    expect(route.next('page5', state)).toBe('page3')
    expect(route.next('page3', state)).toBe('page6')
    expect(route.prev('page3', state)).toBe('page5')
    expect(route.next('page3', { ...state, fillSide: 0 })).toBe('page2')
    expect(route.next('page6', state)).toBe('page2')
    expect(route.next('page2', { ...state, raspolozheniyePolotna: null })).toBe('page6')
    expect(route.prev('page6', state)).toBe('page3')
    expect(route.menu({ ...state, fillSide: 0 }).map(item => item.page).slice(0, 4)).toEqual(['page7', 'page5', 'page3', 'page2'])
    expect(route.next('page5', { ...state, fillSide: 0 })).toBe('page3')
    expect(route.prev('page5', state)).toBe('page7')
    expect(route.prev('page2', state)).toBe('page6')
    expect(route.menu(state).some(item => item.page === 'page1' || item.label === 'Вариант изготовления')).toBe(false)
    expect(route.prev('page7', state)).toBeNull()
  })
  it('orders canvas, shield and painting as separate consecutive sections', () => {
    const route = defineWicketRoute([shieldSection(), canvasSection(), ...standardTailSections()])
    expect(route.menu(state).map(item => item.label)).toEqual([
      'Тип щита', 'Расположение полотна',
      'Окраска', 'Комплект замка', 'Дополнительная ручка', 'Нащельник', 'Рассчитать',
    ])
    expect(route.next('page6', state)).toBe('page_painting')
    expect(route.next('page3', state)).toBe('page6')
    expect(route.prev('page9', state)).toBe('page_priming')
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
    expect(route.next('page10', state)).toBe('page_cover_strip')
    expect(route.prev('page12', state)).toBe('page_cover_strip')
    expect(menuPages).not.toContain('page11')
  })
})

 describe('customer lock set navigation', () => {
  it('skips the catalog forward and backward and accepts a customer set without ID', () => {
    const route = defineWicketRoute(standardTailSections())
    const customer = { ...state, isThereLock: 1, providesLock: 'customer', lockSetId: null }
    expect(route.next('page9', customer)).toBe('page10')
    expect(route.prev('page10', customer)).toBe('page9')
    expect(route.sections.find(section => section.menu.page === 'page9')?.validate(customer).valid).toBe(true)
  })
})
