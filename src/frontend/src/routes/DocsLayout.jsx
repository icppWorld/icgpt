// eslint-disable-next-line no-use-before-define
import React from 'react'
import { Outlet, Link, NavLink } from 'react-router-dom'
import { DOCS } from '../docs/registry'
import '../docs/docs.css'

// Public docs shell. Lives on the top-level `/docs` route (Main.jsx), OUTSIDE the
// App auth/early-access gate, so anybody can read the docs without signing in.
// Makes no icgpt_admin / auth calls.
export function DocsLayout() {
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
  const container = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '36px',
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '28px 20px 60px',
  }
  const sidebar = { width: '210px', flexShrink: 0 }
  const main = { flex: 1, minWidth: 0 }

  const navLink = ({ isActive }) => ({
    display: 'block',
    padding: '7px 10px',
    marginBottom: '2px',
    borderRadius: '6px',
    fontSize: '14px',
    textDecoration: 'none',
    color: isActive ? '#f1fa8c' : '#c7cbe0',
    backgroundColor: isActive ? '#21222c' : 'transparent',
    borderLeft: isActive ? '2px solid #bd93f9' : '2px solid transparent',
  })

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
