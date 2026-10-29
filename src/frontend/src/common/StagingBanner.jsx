import React from 'react'
import { useEnvironment } from './environment'

// Height of the environment bar. Fixed/sticky elements pinned to the top of the viewport
// offset themselves by var(--env-bar-h, 0px); in-flow content is pushed down by the body
// padding set below. Production renders no bar, so both stay 0.
const BAR_HEIGHT = 26

const BARS = {
  staging: {
    background: '#ff5555',
    color: '#ffffff',
    text: 'STAGING ENVIRONMENT — dev accounts only · not the live app',
    link: true,
    titlePrefix: '[STAGING] ',
  },
  local: {
    background: '#6272a4',
    color: '#f8f8f2',
    text: 'LOCAL ENVIRONMENT — local replica',
    link: false,
    titlePrefix: '[LOCAL] ',
  },
}

// Keep the tab title prefixed (eg "[STAGING] ") so environments are distinguishable in tabs
// too. Per-route <title>s are rendered by React, so re-apply the prefix whenever they change.
function useTitlePrefix(prefix) {
  React.useEffect(() => {
    if (!prefix) return undefined
    const apply = () => {
      if (!document.title.startsWith(prefix)) {
        document.title = prefix + document.title
      }
    }
    apply()
    const observer = new MutationObserver(apply)
    observer.observe(document.head, {
      subtree: true,
      childList: true,
      characterData: true,
    })
    return () => observer.disconnect()
  }, [prefix])
}

// A permanent bar at the very top of every page when not in production.
export function StagingBanner() {
  const environment = useEnvironment()
  const bar = BARS[environment]

  React.useEffect(() => {
    const h = bar ? `${BAR_HEIGHT}px` : '0px'
    document.documentElement.style.setProperty('--env-bar-h', h)
    document.body.style.paddingTop = h
  }, [bar])

  useTitlePrefix(bar ? bar.titlePrefix : null)

  if (!bar) return null
  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: `${BAR_HEIGHT}px`,
        zIndex: 10000,
        background: bar.background,
        color: bar.color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        fontFamily: 'monospace',
        fontSize: '12px',
        fontWeight: 'bold',
        letterSpacing: '0.04em',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
      }}
    >
      <span>{bar.text}</span>
      {bar.link ? (
        <a
          href="https://icgpt.onicai.com"
          style={{ color: bar.color, textDecoration: 'underline' }}
        >
          go to icgpt.onicai.com
        </a>
      ) : null}
    </div>
  )
}
