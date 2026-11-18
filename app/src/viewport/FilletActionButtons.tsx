/* oxlint-disable lingui/no-unlocalized-strings -- Preview-only UI copy */
import { useId, useSyncExternalStore } from 'react'
import { getFilletActions, performFilletAction, subscribeFilletActions } from '../tools/fillet/actions'
import { isComposingKey } from '../input/keyboard'

export function FilletActionButtons() {
  const state = useSyncExternalStore(subscribeFilletActions, getFilletActions, getFilletActions)
  const hintId = useId()
  return <div onPointerDown={ev => { ev.preventDefault(); ev.stopPropagation() }} onClick={ev => ev.stopPropagation()}
    onKeyDown={ev => {
      if (['Enter', ' ', 'Spacebar', 'Escape', 'Tab'].includes(ev.key)) ev.stopPropagation()
      if (ev.key === 'Escape' && !isComposingKey(ev)) {
        ev.preventDefault()
        performFilletAction('cancel', state.identity)
      }
    }} onKeyUp={ev => { if (['Enter', ' ', 'Spacebar', 'Escape', 'Tab'].includes(ev.key)) ev.stopPropagation() }}>
    <div className="fillet-actions" role="group" aria-label="Fillet actions">
      <button type="button" disabled={!state.canCancel} onClick={() => performFilletAction('cancel', state.identity)}>Cancel</button>
      <button type="button" className="fillet-apply" disabled={!state.canApply} aria-describedby={!state.canApply ? hintId : undefined}
        onClick={() => performFilletAction('apply', state.identity)}>
        <svg aria-hidden="true" viewBox="0 0 16 16" width="14" height="14"><path d="M3 8l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        Apply Fillet
      </button>
    </div>
    {!state.canApply && state.reason !== null && <small id={hintId} className="fillet-action-hint">{state.reason}</small>}
  </div>
}
