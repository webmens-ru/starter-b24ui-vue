import { describe, expect, it } from 'vitest'
import { WicketProductRowLockConflictError } from './api/wicketProductRowLockVersion'
import { wicketFailureMessage } from './wicketFailureMessage'

const fallback = 'Не удалось сохранить окраску'

describe('wicketFailureMessage', () => {
  it('combines distinct catalog and field validation messages', () => {
    const error = { response: { status: 422, data: {
      problems: [{ message: ' Заглушка не настроена ' }, { message: 'Заглушка не настроена' }, null],
      errors: { colorId: ['Выберите цвет', null], coatingId: 'Выберите покрытие' },
    } } }
    expect(wicketFailureMessage(error, fallback)).toBe('Заглушка не настроена\nВыберите цвет\nВыберите покрытие')
  })

  it.each([
    new WicketProductRowLockConflictError(),
    { response: { status: 409, data: { message: 'Server internals' } } },
  ])('asks for reload after a local or server conflict', error => {
    expect(wicketFailureMessage(error, fallback)).toBe('Позиция уже изменилась. Перезагрузите страницу и повторите сохранение.')
  })

  it.each([
    { data: { message: 'Проверьте данные', error: 'Общая ошибка' }, expected: 'Проверьте данные' },
    { data: { error: 'Общая ошибка' }, expected: 'Общая ошибка' },
    { data: { problems: [false], errors: { field: [42] } }, expected: fallback },
  ])('uses a validation summary when there are no detailed messages', ({ data, expected }) => {
    expect(wicketFailureMessage({ response: { status: 422, data } }, fallback)).toBe(expected)
  })

  it.each([
    null, new Error('Network error'), {},
    { response: { status: 500, data: { message: '/app/private/Exception.php', errors: { secret: ['internal'] } } } },
    { response: { status: 422, data: null } },
    { response: { status: 422, data: [] } },
  ])('keeps the safe fallback for unexpected errors', error => {
    expect(wicketFailureMessage(error, fallback)).toBe(fallback)
  })
})
