import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * How long an operation runs before its progress card appears, so quick
 * imports and exports never flash one.
 */
const PROGRESS_CARD_DELAY_MS = 400

type OperationPhase = 'idle' | 'running' | 'canceling'

/**
 * State of one cancelable operation as the progress card shows it.
 */
export interface OperationProgressState {
  phase: OperationPhase
  done: number
  total: number
  skippedDuplicates: number
  isCardVisible: boolean
}

/**
 * Controls for a cancelable operation: `begin` starts one and returns its
 * abort signal, `report` feeds progress events, `requestCancel` aborts and
 * flips the card to its canceling state, and `end` returns to idle.
 */
export interface OperationProgressControls {
  state: OperationProgressState
  begin: () => AbortSignal
  report: (progress: {
    done: number
    total: number
    skippedDuplicates?: number
  }) => void
  requestCancel: () => void
  end: () => void
}

/**
 * Tracks the progress of one long import or export and when to show its
 * card: only once the operation has run past {@link PROGRESS_CARD_DELAY_MS},
 * and always while canceling.
 * @returns The state and the controls that drive it.
 */
export function useOperationProgress(): OperationProgressControls {
  const [phase, setPhase] = useState<OperationPhase>('idle')
  const [counts, setCounts] = useState({
    done: 0,
    total: 0,
    skippedDuplicates: 0,
  })
  const [hasDelayPassed, setHasDelayPassed] = useState(false)
  const controllerReference = useRef<AbortController | null>(null)

  useEffect(() => {
    if (phase === 'idle') return
    const timer = setTimeout(
      () => setHasDelayPassed(true),
      PROGRESS_CARD_DELAY_MS,
    )
    return () => clearTimeout(timer)
  }, [phase])

  const begin = useCallback(() => {
    const controller = new AbortController()
    controllerReference.current = controller
    setCounts({ done: 0, total: 0, skippedDuplicates: 0 })
    setHasDelayPassed(false)
    setPhase('running')
    return controller.signal
  }, [])

  const report = useCallback<OperationProgressControls['report']>(
    ({ done, total, skippedDuplicates = 0 }) =>
      setCounts({ done, total, skippedDuplicates }),
    [],
  )

  const requestCancel = useCallback(() => {
    controllerReference.current?.abort()
    setPhase('canceling')
  }, [])

  const end = useCallback(() => {
    controllerReference.current = null
    setPhase('idle')
    setHasDelayPassed(false)
  }, [])

  return {
    state: {
      phase,
      ...counts,
      isCardVisible:
        phase === 'canceling' || (phase === 'running' && hasDelayPassed),
    },
    begin,
    report,
    requestCancel,
    end,
  }
}
