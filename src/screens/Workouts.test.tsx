/** @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../hooks', () => ({
  useWorkouts: () => [[{ id: '1', date: '2026-10-26', kind: 'musculacao' }], async () => {}],
}))

vi.mock('../lib/auth-context', () => ({
  useAuthProfile: () => ({ id: 'user-1' }),
}))

vi.mock('../lib/repo', () => ({
  upsertWorkoutDay: vi.fn(),
  deleteWorkoutDay: vi.fn(),
}))

import { Workouts } from './Workouts'

describe('tela de treino', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 26, 12))
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('mostra outubro e o dia 26 marcado', () => {
    render(<Workouts />)
    expect(screen.getByRole('grid', { name: 'Dias de academia' })).toBeTruthy()
    expect(screen.getByRole('gridcell', { name: '2026-10-26 marcado' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Desmarcar este dia' })).toBeTruthy()
    expect(screen.getByText('1 dia neste mês')).toBeTruthy()
  })
})
