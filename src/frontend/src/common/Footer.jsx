// eslint-disable-next-line no-use-before-define
import React from 'react'
import 'dracula-ui/styles/dracula-ui.css'

// ICGPT's on-chain heritage, demoted to a quiet trust signal in the footer
// (the forward-looking story lives on the landing hero).
const FORUM_URL =
  'https://forum.dfinity.org/t/llama2-c-llm-running-in-a-canister/21991/16'

// `fixed` pins a single compact line to the very bottom of the viewport — used
// in the studio, whose input + controls are all fixed-position (a normal-flow
// footer would otherwise float up into the empty conversation area). The
// landing uses the default (normal flow, below the centered hero).
export function Footer({ fixed = false }) {
  const story = (
    <a
      href={FORUM_URL}
      target="_blank"
      rel="noreferrer"
      style={{ color: '#6272a4', textDecoration: 'underline' }}
    >
      The story →
    </a>
  )

  if (fixed) {
    return (
      <footer
        className="container-fluid"
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          textAlign: 'center',
          color: '#6272a4',
          fontSize: '11px',
          padding: '6px 0',
          lineHeight: 1.4,
          pointerEvents: 'none',
        }}
      >
        <p style={{ margin: 0, pointerEvents: 'auto' }}>
          ICGPT has served on-chain LLMs since 2023. {story}
          <span style={{ margin: '0 6px' }}>·</span>© {new Date().getFullYear()}{' '}
          | onicai
        </p>
      </footer>
    )
  }

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
        ICGPT has served on-chain LLMs since 2023. {story}
      </p>
      <p style={{ margin: 0 }}>© {new Date().getFullYear()} | onicai</p>
    </footer>
  )
}
