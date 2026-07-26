// eslint-disable-next-line no-use-before-define
import React from 'react'

// True when the viewport is at most `maxWidth` px wide (default 640 — phones and
// small tablets in portrait). Used to switch the heavily inline-styled, fixed-
// position studio chrome (ModelSelector, top-right actions, StatsBar) between the
// desktop layout and a stacked mobile layout. Re-renders on viewport change.
export function useIsMobile(maxWidth = 640) {
  const query = `(max-width: ${maxWidth}px)`
  const [isMobile, setIsMobile] = React.useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches
  )
  React.useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = () => setIsMobile(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])
  return isMobile
}
