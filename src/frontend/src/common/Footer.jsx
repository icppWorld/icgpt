// eslint-disable-next-line no-use-before-define
import React from 'react'
import 'dracula-ui/styles/dracula-ui.css'

// ICGPT's on-chain heritage, demoted to a quiet trust signal in the footer
// (the forward-looking story lives on the landing hero).
const FORUM_URL =
  'https://forum.dfinity.org/t/llama2-c-llm-running-in-a-canister/21991/16'

export function Footer() {
  return (
    <footer
      className="container-fluid"
      style={{
        textAlign: 'center',
        color: '#6272a4',
        fontSize: '11px',
        padding: '14px 0',
      }}
    >
      <p style={{ margin: '0 0 4px' }}>
        ICGPT has served on-chain LLMs since 2023.{' '}
        <a
          href={FORUM_URL}
          target="_blank"
          rel="noreferrer"
          style={{ color: '#6272a4', textDecoration: 'underline' }}
        >
          The story →
        </a>
      </p>
      <p style={{ margin: 0 }}>© {new Date().getFullYear()} | onicai</p>
    </footer>
  )
}
