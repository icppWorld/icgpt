// eslint-disable-next-line no-use-before-define
import React from 'react'
import PropTypes from 'prop-types'
import { Link, useLocation } from 'react-router-dom'
import { useIsMobile } from './useIsMobile'

// The shared top navigation bar for every signed-in page (rendered once in App.jsx above the
// Outlet). A single fixed 48px row: brand on the left, primary tabs + Admin + logout on the
// right. Replaces the old per-page inline nav cluster that overlapped the ModelSelector toolbar.

// Primary destinations (Docs, Admin, logout handled separately below).
const TABS = [
  {
    key: 'lab',
    label: 'Lab',
    icon: 'bi-graph-up',
    color: '#bd93f9',
    to: '/',
    isActive: (p) => p === '/' || p === '/lab',
  },
  {
    key: 'chat',
    label: 'Chat',
    icon: 'bi-chat-dots',
    color: '#ffb86c',
    to: '/chat',
    isActive: (p) => p === '/chat',
  },
  {
    key: 'canisters',
    label: 'Canisters',
    icon: 'bi-hdd-stack',
    color: '#50fa7b',
    to: '/canisters',
    isActive: (p) => p === '/canisters',
  },
]

export const TOPNAV_HEIGHT = 48

export function TopNav({ access, onOpenAdmin, onLogout }) {
  const isMobile = useIsMobile()
  const path = useLocation().pathname

  const bar = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    height: `${TOPNAV_HEIGHT}px`,
    zIndex: 1000,
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    padding: '0 12px',
    backgroundColor: '#1a1b23',
    borderBottom: '1px solid #44475a',
    fontFamily: 'monospace',
  }

  // A pill button/link. `active` gives it the accent-colored border + a lifted background.
  const pill = (color, active) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    backgroundColor: active ? '#282a36' : '#21222c',
    color,
    border: `1px solid ${active ? color : '#44475a'}`,
    borderRadius: '6px',
    padding: isMobile ? '5px 8px' : '4px 9px',
    fontFamily: 'monospace',
    fontSize: '13px',
    lineHeight: 1,
    textDecoration: 'none',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  })

  return (
    <div style={bar}>
      {/* Brand → home (the Lab) */}
      <Link
        to="/"
        title="ICGPT — On-chain Prompt Studio"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '9px',
          textDecoration: 'none',
          flexShrink: 0,
        }}
      >
        <img
          src="/onicai-icon-logo.svg"
          alt="onicai"
          style={{ height: '26px', width: 'auto' }}
        />
        {isMobile ? null : (
          <span
            style={{ color: '#f1fa8c', fontWeight: 'bold', fontSize: '16px' }}
          >
            ICGPT
          </span>
        )}
      </Link>

      {/* Nav + actions. overflow-x:auto keeps the bar a single stable-height row
          even on very narrow screens (the group scrolls instead of wrapping). */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '7px',
          overflowX: 'auto',
        }}
      >
        {TABS.map((t) => {
          const active = t.isActive(path)
          return (
            <Link
              key={t.key}
              to={t.to}
              title={t.label}
              style={pill(t.color, active)}
            >
              <i className={`bi ${t.icon}`}></i>
              {isMobile ? null : t.label}
            </Link>
          )
        })}
        <a
          href="/docs"
          target="_blank"
          rel="noreferrer"
          title="Docs"
          style={pill('#8be9fd', false)}
        >
          <i className="bi bi-book"></i>
          {isMobile ? null : 'Docs'}
        </a>
        {access?.isAdmin ? (
          <button
            type="button"
            onClick={onOpenAdmin}
            title="Admin panel"
            style={pill('#ff79c6', false)}
          >
            <i className="bi bi-shield-lock"></i>
            {isMobile ? null : 'Admin'}
          </button>
        ) : null}
        <button
          type="button"
          onClick={onLogout}
          title="Log out"
          aria-label="Log out"
          style={pill('#ff5555', false)}
        >
          <i className="bi bi-box-arrow-right"></i>
        </button>
      </div>
    </div>
  )
}

TopNav.propTypes = {
  access: PropTypes.object,
  onOpenAdmin: PropTypes.func.isRequired,
  onLogout: PropTypes.func.isRequired,
}
