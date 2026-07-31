import type { MealPeriod } from '@glamping/types'

interface TimeSlot {
  period: MealPeriod
  slotStart: number
  slotEnd: number
  bufferEnd: number
}

export const SLOTS: TimeSlot[] = [
  { period: 'breakfast', slotStart: 8, slotEnd: 10, bufferEnd: 11 },
  { period: 'lunch', slotStart: 13, slotEnd: 15, bufferEnd: 16 },
  { period: 'dinner', slotStart: 19, slotEnd: 21, bufferEnd: 22 },
]

export function periodFromTime(time: string): MealPeriod {
  const hour = parseInt(time.split(':')[0])
  for (const slot of SLOTS) {
    if (hour >= slot.slotStart && hour < slot.bufferEnd) {
      return slot.period
    }
  }
  return 'none'
}

function getMinutesFromMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes()
}

export function computePeriodInfo(now: Date): {
  currentPeriod: MealPeriod
  isInBuffer: boolean
  nextPeriod: MealPeriod
  bufferEndsAt: Date | null
} {
  const minutes = getMinutesFromMidnight(now)

  for (let i = 0; i < SLOTS.length; i++) {
    const slot = SLOTS[i]
    const slotStartMin = slot.slotStart * 60
    const slotEndMin = slot.slotEnd * 60
    const bufferEndMin = slot.bufferEnd * 60

    if (minutes >= slotStartMin && minutes < slotEndMin) {
      const nextSlot = SLOTS[i + 1]
      return {
        currentPeriod: slot.period,
        isInBuffer: false,
        nextPeriod: nextSlot ? nextSlot.period : 'none',
        bufferEndsAt: null,
      }
    }

    if (minutes >= slotEndMin && minutes < bufferEndMin) {
      const bufferEndsAt = new Date(now)
      bufferEndsAt.setHours(slot.bufferEnd, 0, 0, 0)
      const nextSlot = SLOTS[i + 1]
      return {
        currentPeriod: slot.period,
        isInBuffer: true,
        nextPeriod: nextSlot ? nextSlot.period : 'none',
        bufferEndsAt,
      }
    }
  }

  return { currentPeriod: 'none', isInBuffer: false, nextPeriod: 'none', bufferEndsAt: null }
}
