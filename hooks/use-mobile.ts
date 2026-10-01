import * as React from 'react'

const MOBILE_BREAKPOINT = 768
const MOBILE_QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

function subscribe(onChange: () => void) {
  const mql = globalThis.matchMedia(MOBILE_QUERY)
  mql.addEventListener('change', onChange)
  return () => mql.removeEventListener('change', onChange)
}

function isMobileSnapshot() {
  return globalThis.matchMedia(MOBILE_QUERY).matches
}

function isMobileServerSnapshot() {
  return false
}

export function useIsMobile() {
  return React.useSyncExternalStore(
    subscribe,
    isMobileSnapshot,
    isMobileServerSnapshot,
  )
}
