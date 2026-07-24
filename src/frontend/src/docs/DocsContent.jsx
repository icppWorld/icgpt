// eslint-disable-next-line no-use-before-define
import React from 'react'
import PropTypes from 'prop-types'
import { useNavigate } from 'react-router-dom'

// Renders an author-written HTML fragment (from the docs registry) into a
// dracula-styled `.docs-prose` container. Safe because the content is
// author-only and never user input — do NOT route user content through here.
//
// Internal links inside the fragment (href starting with "/") are intercepted
// and navigated client-side, so they stay SPA. External links (http(s)) and any
// target="_blank" link behave normally.
export function DocsContent({ html }) {
  const navigate = useNavigate()

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
