// eslint-disable-next-line no-use-before-define
import React from 'react'
import PropTypes from 'prop-types'
import { useNavigate, useLocation } from 'react-router-dom'

// Renders an author-written HTML fragment (from the docs registry) into a
// dracula-styled `.docs-prose` container. Safe because the content is
// author-only and never user input — do NOT route user content through here.
//
// Internal links inside the fragment (href starting with "/") are intercepted
// and navigated client-side, so they stay SPA. External links (http(s)) and any
// target="_blank" link behave normally.
export function DocsContent({ html }) {
  const navigate = useNavigate()
  const location = useLocation()

  // Deep-link support: when the page loads (or the hash changes) with a
  // `#section` fragment, scroll to that element. The docs HTML is injected via
  // dangerouslySetInnerHTML, so the target only exists AFTER this component
  // renders — the browser's native hash-scroll fires too early and misses it.
  React.useEffect(() => {
    if (!location.hash) return undefined
    const id = decodeURIComponent(location.hash.slice(1))
    // Instant (not smooth) jump, run twice: on a fresh deep-link the page is
    // still laying out (images below load in), and a smooth animation gets
    // disturbed mid-flight and overshoots the heading. An instant jump after
    // first paint lands exactly on it (respecting scroll-margin-top); the 350ms
    // re-scroll snaps it back if late-loading assets shifted the layout.
    const scroll = () => {
      const el = document.getElementById(id)
      if (el) el.scrollIntoView({ block: 'start' })
    }
    const raf = requestAnimationFrame(scroll)
    const t = setTimeout(scroll, 350)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(t)
    }
  }, [html, location.hash])

  function handleClick(e) {
    const a = e.target.closest('a')
    if (!a) return
    const href = a.getAttribute('href')
    if (!href || !href.startsWith('/')) return // external / anchor: leave alone
    if (a.target === '_blank') return
    e.preventDefault()
    navigate(href)
    window.scrollTo(0, 0)
  }

  return (
    <div
      className="docs-prose"
      onClick={handleClick}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

DocsContent.propTypes = {
  html: PropTypes.string.isRequired,
}
