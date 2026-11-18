import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { FilletActionButtons } from './FilletActionButtons'
import { ToolOptionsCard } from './ToolOptionsCard'

const mock = vi.hoisted(() => ({ state: { identity: 'operation', canApply: false, canCancel: false, reason: 'Pick an edge first.' as string | null }, perform: vi.fn() }))
vi.mock('../tools/fillet/actions', () => ({
  getFilletActions: () => mock.state,
  subscribeFilletActions: () => () => {},
  performFilletAction: mock.perform,
}))
beforeEach(() => { mock.state = { identity: 'operation', canApply: false, canCancel: false, reason: 'Pick an edge first.' }; mock.perform.mockClear() })

it('disables unavailable actions and explains Apply availability', () => {
  render(<FilletActionButtons />)
  expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Apply Fillet' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Apply Fillet' })).toHaveAccessibleDescription('Pick an edge first.')
  fireEvent.click(screen.getByRole('button', { name: 'Apply Fillet' }))
  expect(mock.perform).not.toHaveBeenCalled()
})

it('keeps actions in a separate footer, contains pointer/key events, and invokes one action', () => {
  mock.state = { identity: 'operation', canApply: true, canCancel: true, reason: null }
  const pointer = vi.fn(), key = vi.fn()
  const viewport = document.createElement('button')
  document.body.append(viewport)
  viewport.focus()
  render(<div onPointerDown={pointer} onKeyDown={key}><ToolOptionsCard tool="Action test" info="Help." footer={<FilletActionButtons />}>Settings</ToolOptionsCard></div>)
  const apply = screen.getByRole('button', { name: 'Apply Fillet' })
  expect(apply.closest('.tool-options-body')).toBeNull()
  expect(apply.closest('.tool-options-footer')).not.toBeNull()
  expect(fireEvent.pointerDown(apply)).toBe(false)
  expect(pointer).not.toHaveBeenCalled()
  expect(document.activeElement).toBe(viewport)
  fireEvent.click(apply)
  expect(mock.perform).toHaveBeenCalledExactlyOnceWith('apply', 'operation')
  apply.focus()
  fireEvent.keyDown(apply, { key: 'Escape' })
  expect(key).not.toHaveBeenCalled()
  expect(mock.perform).toHaveBeenLastCalledWith('cancel', 'operation')
  fireEvent.keyDown(apply, { key: 'z', ctrlKey: true })
  expect(key).toHaveBeenCalledTimes(1)
  viewport.remove()
})
