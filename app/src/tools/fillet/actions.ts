/* oxlint-disable lingui/no-unlocalized-strings -- Preview-only UI copy */
/** Operation-owned UI actions; completion and cancellation stay on FilletTool. */
import { getLengthUnit } from '../../settings/units'
import { parseCurveInput } from '../curveInput'
import { MIN_FILLET_SIZE } from '../filletMath'
import { currentAmount, editSize, resolve } from './spec'
import type { FilletContext } from './context'
import type { Stage } from './types'

export interface FilletActionSnapshot {
  identity: string
  canApply: boolean
  canCancel: boolean
  reason: string | null
}
const EMPTY: FilletActionSnapshot = { identity: '', canApply: false, canCancel: false, reason: 'Pick an edge or face first.' }
let active: FilletActions | null = null
let current = EMPTY
let nextOperation = 0
const listeners = new Set<() => void>()
export const getFilletActions = (): FilletActionSnapshot => current
export const subscribeFilletActions = (cb: () => void): (() => void) => {
  listeners.add(cb)
  return () => { listeners.delete(cb) }
}
export function connectFilletActions(source: FilletActions): void { active = source; source.publish() }
export function disconnectFilletActions(source: FilletActions): void {
  if (active !== source) return
  active = null
  current = EMPTY
  for (const cb of [...listeners]) cb()
}
export function performFilletAction(action: 'apply' | 'cancel', identity: string): void {
  active?.perform(action, identity)
}

export class FilletActions {
  private stage: Stage | null = null
  private operation = 0
  private consumed: string | null = null
  constructor(private readonly c: FilletContext, private readonly finish: () => void, private readonly escape: () => void) {}

  snapshot(): FilletActionSnapshot {
    const s = this.c.stage
    if (s !== this.stage) { this.stage = s; this.operation = ++nextOperation }
    const identity = `${this.operation}:${this.c.epoch}:${s.kind === 'armed' ? JSON.stringify(s.active) + s.typed + ':' + s.gripTyped : s.kind === 'edit' ? s.typed : this.c.collected.length + ':' + this.c.retype.isOpen + this.c.retypeTyped}`
    const canCancel = s.kind !== 'idle' || this.c.collected.length > 0 || this.c.retypeTyped !== ''
    let reason: string | null = null
    if (s.kind === 'idle') reason = 'Pick an edge or face first.'
    else if (this.c.dimensionEditing) reason = 'Finish editing the dimension first.'
    else if (s.kind === 'armed' && ((s.grab !== null && s.grab.kind !== 'radius') || s.gripTyped !== '')) reason = 'Finish the active grip edit with Enter first.'
    else {
      if (s.typed !== '') {
        const parsed = parseCurveInput(s.typed, getLengthUnit())
        if ('error' in parsed || parsed.kind === 'segments') reason = 'Finish the dimension in Measurements first.'
      }
      if (reason === null && s.kind === 'armed') {
        const amount = currentAmount(s)
        const r = amount === null ? null : resolve(s.targets[0], amount, s.profile)
        if (r === null || 'error' in r || (r.headline !== null && !(r.headline > MIN_FILLET_SIZE))) reason = 'Set a valid size first.'
        else if (amount?.src === 'typed' && this.c.clampedHeadline !== null && r.headline !== null && r.headline > this.c.clampedHeadline) reason = 'The typed size exceeds the preview limit.'
      }
      if (reason === null && s.kind === 'edit') {
        const value = editSize(s)
        if (value === null || !(value > MIN_FILLET_SIZE)) reason = 'Set a valid size first.'
        else if (s.limit !== null && value > s.limit.max * s.frame.scale) reason = 'The size exceeds the preview limit.'
      }
      if (reason === null && !this.c.previewReady) reason = 'Apply is available after an accepted preview.'
      if (reason === null && this.consumed === identity) reason = 'Completion has already been requested.'
    }
    return { identity, canApply: reason === null, canCancel, reason }
  }

  publish(): void {
    if (active !== this) return
    const next = this.snapshot()
    if (next.identity === current.identity && next.canApply === current.canApply && next.canCancel === current.canCancel && next.reason === current.reason) return
    current = next
    for (const cb of [...listeners]) cb()
  }

  perform(action: 'apply' | 'cancel', identity: string): void {
    const state = this.snapshot()
    if (state.identity !== identity || !(action === 'apply' ? state.canApply : state.canCancel)) return
    this.c.pendingMove = null
    if (action === 'apply') {
      this.consumed = identity
      this.finish()
      this.consumed = this.snapshot().identity
    }
    else this.escape()
    this.c.hooks.requestRender()
    this.publish()
  }
}
