import { computePeriodInfo } from './useMealPeriod'

function makeDate(hours: number, minutes = 0): Date {
  const d = new Date()
  d.setHours(hours, minutes, 0, 0)
  return d
}

describe('computePeriodInfo', () => {
  test('08:00 → breakfast, not in buffer', () => {
    const r = computePeriodInfo(makeDate(8, 0))
    expect(r.currentPeriod).toBe('breakfast')
    expect(r.isInBuffer).toBe(false)
  })

  test('09:59 → breakfast, not in buffer', () => {
    const r = computePeriodInfo(makeDate(9, 59))
    expect(r.currentPeriod).toBe('breakfast')
    expect(r.isInBuffer).toBe(false)
  })

  test('10:00 → breakfast, IN buffer', () => {
    const r = computePeriodInfo(makeDate(10, 0))
    expect(r.currentPeriod).toBe('breakfast')
    expect(r.isInBuffer).toBe(true)
    expect(r.nextPeriod).toBe('lunch')
    expect(r.bufferEndsAt).not.toBeNull()
  })

  test('10:59 → breakfast, IN buffer', () => {
    const r = computePeriodInfo(makeDate(10, 59))
    expect(r.currentPeriod).toBe('breakfast')
    expect(r.isInBuffer).toBe(true)
  })

  test('12:00 → none', () => {
    const r = computePeriodInfo(makeDate(12, 0))
    expect(r.currentPeriod).toBe('none')
    expect(r.isInBuffer).toBe(false)
  })

  test('13:00 → lunch, not in buffer', () => {
    const r = computePeriodInfo(makeDate(13, 0))
    expect(r.currentPeriod).toBe('lunch')
    expect(r.isInBuffer).toBe(false)
  })

  test('15:30 → lunch, IN buffer', () => {
    const r = computePeriodInfo(makeDate(15, 30))
    expect(r.currentPeriod).toBe('lunch')
    expect(r.isInBuffer).toBe(true)
    expect(r.nextPeriod).toBe('dinner')
  })

  test('19:00 → dinner, not in buffer', () => {
    const r = computePeriodInfo(makeDate(19, 0))
    expect(r.currentPeriod).toBe('dinner')
    expect(r.isInBuffer).toBe(false)
  })

  test('21:01 → dinner, IN buffer', () => {
    const r = computePeriodInfo(makeDate(21, 1))
    expect(r.currentPeriod).toBe('dinner')
    expect(r.isInBuffer).toBe(true)
    expect(r.nextPeriod).toBe('none')
  })

  test('23:00 → none', () => {
    const r = computePeriodInfo(makeDate(23, 0))
    expect(r.currentPeriod).toBe('none')
    expect(r.isInBuffer).toBe(false)
  })

  test('03:00 → none', () => {
    const r = computePeriodInfo(makeDate(3, 0))
    expect(r.currentPeriod).toBe('none')
    expect(r.isInBuffer).toBe(false)
  })
})
