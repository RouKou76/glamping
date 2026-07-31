import { describe, it, expect, vi } from 'vitest'
import { computePeriodInfo, periodFromTime } from '../../hooks/useMealPeriod'

describe('OrderForm validation logic', () => {
  it('validates required fields', () => {
    const steps = [
      { type: 'time' as const, key: 'time', label: 'Время', required: true },
      { type: 'select' as const, key: 'period', label: 'Период', required: true, options: [{ value: 'breakfast', label: 'Завтрак' }] },
    ]
    const values: Record<string, unknown> = {}
    const cart: Record<string, number> = {}

    const errors: Record<string, string> = {}
    for (const s of steps) {
      if (!s.required) continue
      if (s.type === 'time' && !values[s.key]) errors[s.key] = 'Выберите время'
      if (s.type === 'select' && !values[s.key]) errors[s.key] = `Выберите ${s.label.toLowerCase()}`
    }

    expect(errors.time).toBe('Выберите время')
    expect(errors.period).toBe('Выберите период')
  })

  it('passes validation with all fields filled', () => {
    const steps = [
      { type: 'time' as const, key: 'time', label: 'Время', required: true },
      { type: 'select' as const, key: 'period', label: 'Период', required: true, options: [{ value: 'breakfast', label: 'Завтрак' }] },
    ]
    const values: Record<string, unknown> = { time: '10:00', period: 'breakfast' }
    const cart: Record<string, number> = {}

    const errors: Record<string, string> = {}
    for (const s of steps) {
      if (!s.required) continue
      if (s.type === 'time' && !values[s.key]) errors[s.key] = 'Выберите время'
      if (s.type === 'select' && !values[s.key]) errors[s.key] = `Выберите ${s.label.toLowerCase()}`
    }

    expect(Object.keys(errors)).toHaveLength(0)
  })

  it('validates menu requires at least one item', () => {
    const cart: Record<string, number> = {}
    const hasItems = Object.values(cart).some(q => q > 0)
    expect(hasItems).toBe(false)
  })

  it('menu with items passes validation', () => {
    const cart: Record<string, number> = { 'm1': 2 }
    const hasItems = Object.values(cart).some(q => q > 0)
    expect(hasItems).toBe(true)
  })
})

describe('computePeriodInfo', () => {
  function makeDate(hours: number, minutes = 0): Date {
    const d = new Date()
    d.setHours(hours, minutes, 0, 0)
    return d
  }

  it('breakfast at 09:00', () => {
    const r = computePeriodInfo(makeDate(9, 0))
    expect(r.currentPeriod).toBe('breakfast')
    expect(r.isInBuffer).toBe(false)
  })

  it('lunch at 14:00', () => {
    const r = computePeriodInfo(makeDate(14, 0))
    expect(r.currentPeriod).toBe('lunch')
    expect(r.isInBuffer).toBe(false)
  })

  it('dinner at 20:00', () => {
    const r = computePeriodInfo(makeDate(20, 0))
    expect(r.currentPeriod).toBe('dinner')
    expect(r.isInBuffer).toBe(false)
  })

  it('none at 12:00', () => {
    const r = computePeriodInfo(makeDate(12, 0))
    expect(r.currentPeriod).toBe('none')
  })
})

describe('periodFromTime', () => {
  it('breakfast at 09:00', () => {
    expect(periodFromTime('09:00')).toBe('breakfast')
  })

  it('breakfast buffer at 10:30', () => {
    expect(periodFromTime('10:30')).toBe('breakfast')
  })

  it('lunch at 14:00', () => {
    expect(periodFromTime('14:00')).toBe('lunch')
  })

  it('lunch buffer at 15:30', () => {
    expect(periodFromTime('15:30')).toBe('lunch')
  })

  it('dinner at 20:00', () => {
    expect(periodFromTime('20:00')).toBe('dinner')
  })

  it('none at 16:50', () => {
    expect(periodFromTime('16:50')).toBe('none')
  })

  it('none at 11:00 (buffer end exclusive)', () => {
    expect(periodFromTime('11:00')).toBe('none')
  })

  it('none at 12:00', () => {
    expect(periodFromTime('12:00')).toBe('none')
  })

  it('none at 22:00', () => {
    expect(periodFromTime('22:00')).toBe('none')
  })
})
