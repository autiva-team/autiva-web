import { createElement } from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen, act } from '@testing-library/react'
import ConnectionBadge from './ConnectionBadge'
vi.mock('../offline/syncQueue', () => ({ EVENTO_PENDIENTES: 'autiva:pendientes', contarPendientes: vi.fn(async () => 0) }))
afterEach(() => { cleanup(); Object.defineProperty(navigator, 'onLine', { configurable: true, value: true }) })
it('cambia el estado al perder y recuperar internet', async () => {
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true })
  await act(async () => { render(createElement(ConnectionBadge)) })
  expect(screen.getByText('En línea')).toBeTruthy()
  act(() => { Object.defineProperty(navigator, 'onLine', { configurable: true, value: false }); window.dispatchEvent(new Event('offline')) })
  expect(screen.getByText('Sin conexión')).toBeTruthy()
  expect(screen.getByRole('status').className).toContain('offline')
  act(() => { Object.defineProperty(navigator, 'onLine', { configurable: true, value: true }); window.dispatchEvent(new Event('online')) })
  expect(screen.getByText('En línea')).toBeTruthy()
})
