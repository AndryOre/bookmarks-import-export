import { act } from 'react'
import type { ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { vi } from 'vitest'

/**
 * A mounted React root in the jsdom document, for tests that exercise hooks
 * and providers without a testing-library dependency.
 */
export interface DomHarness {
  container: HTMLElement
  render: (element: ReactNode) => Promise<void>
  unmount: () => void
}

/**
 * Mounts a fresh React root inside `document.body` and flags the environment
 * as an `act` environment. Call `unmount` when the test ends.
 * @returns The mounted harness.
 */
export function createDomHarness(): DomHarness {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  let isMounted = true

  return {
    container,
    async render(element) {
      await act(async () => {
        root.render(element)
      })
    },
    unmount() {
      if (!isMounted) return
      isMounted = false
      act(() => root.unmount())
      container.remove()
    },
  }
}
