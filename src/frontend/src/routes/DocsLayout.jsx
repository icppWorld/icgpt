// eslint-disable-next-line no-use-before-define
import React from 'react'
import { Outlet, Link, NavLink } from 'react-router-dom'
import { DOCS } from '../docs/registry'
import { useIsMobile } from '../common/useIsMobile'
import '../docs/docs.css'

// Public docs shell. Lives on the top-level `/docs` route (Main.jsx), OUTSIDE the
// App auth/early-access gate, so anybody can read the docs without signing in.
// Makes no icgpt_admin / auth calls.
export function DocsLayout() {
  const isMobile = useIsMobile()
  const page = {
    minHeight: '100vh',
    backgroundColor: '#282a36',
    color: '#f8f8f2',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  }
  const header = {
    position: 'sticky',
    top: 0,
    zIndex: 10,
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 20px',
    borderBottom: '1px solid #44475a',
    backgroundColor: '#282a36cc',
    backdropFilter: 'blur(6px)',
  }
  const cta = {
    marginLeft: 'auto',
    backgroundColor: '#bd93f9',
    color: '#21222c',
    textDecoration: 'none',
    fontWeight: 'bold',
    fontSize: '14px',
    borderRadius: '8px',
    padding: '8px 14px',
    whiteSpace: 'nowrap',
  }
  // Mobile: stack the nav above the content as a horizontal, scrollable strip of
  // links instead of a fixed 210px vertical sidebar. Desktop: the sidebar.
  const container = {
    display: 'flex',
    flexDirection: isMobile ? 'column' : 'row',
    flexWrap: isMobile ? 'nowrap' : 'wrap',
    gap: isMobile ? '18px' : '36px',
    maxWidth: '1100px',
    margin: '0 auto',
    padding: isMobile ? '18px 16px 48px' : '28px 20px 60px',
  }
  const sidebar = isMobile
    ? {
        width: '100%',
        display: 'flex',
        gap: '6px',
        overflowX: 'auto',
        paddingBottom: '8px',
        borderBottom: '1px solid #44475a',
        WebkitOverflowScrolling: 'touch',
      }
    : { width: '210px', flexShrink: 0 }
  const main = { flex: 1, minWidth: 0 }

  const navLink = ({ isActive }) =>
    isMobile
      ? {
          flex: '0 0 auto',
          padding: '6px 12px',
          borderRadius: '999px',
          fontSize: '13px',
          whiteSpace: 'nowrap',
          textDecoration: 'none',
          color: isActive ? '#21222c' : '#c7cbe0',
          backgroundColor: isActive ? '#bd93f9' : '#21222c',
          border: '1px solid #44475a',
        }
      : {
          display: 'block',
          padding: '7px 10px',
          marginBottom: '2px',
          borderRadius: '6px',
          fontSize: '14px',
          textDecoration: 'none',
          color: isActive ? '#f1fa8c' : '#c7cbe0',
          backgroundColor: isActive ? '#21222c' : 'transparent',
          borderLeft: isActive ? '2px solid #bd93f9' : '2px solid transparent',
        }

  return (
    <div style={page}>
      <div style={header}>
        <Link
          to="/docs"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            textDecoration: 'none',
            color: '#f8f8f2',
          }}
        >
          <img
            src="/onicai-icon-logo.svg"
            alt="onicai"
            style={{ height: '26px', width: 'auto' }}
          />
          <span style={{ fontWeight: 'bold', fontSize: '15px' }}>
            ICGPT Docs
          </span>
        </Link>
        <a href="/" style={cta}>
          Request early access →
        </a>
      </div>

      <div style={container}>
        <nav style={sidebar}>
          {DOCS.map((d) => (
            <NavLink key={d.slug} to={`/docs/${d.slug}`} style={navLink}>
              {d.title}
            </NavLink>
          ))}
        </nav>
        <main style={main}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
