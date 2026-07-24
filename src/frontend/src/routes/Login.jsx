// eslint-disable-next-line no-use-before-define
import React from 'react'
import { Helmet } from 'react-helmet'
import 'dracula-ui/styles/dracula-ui.css'

import { Footer } from '../common/Footer'
import { LogInWithInternetIdentity } from './LoginWithInternetIdentity'

const OPENCHAT_URL =
  'https://oc.app/community/mepna-eqaaa-aaaar-bclua-cai/channel/2881126157'

export function Login({ setAuthClient }) {
  const [showDocsComingSoon, setShowDocsComingSoon] = React.useState(false)

  const linkStyle = {
    color: '#8be9fd',
    textDecoration: 'none',
    fontSize: '14px',
  }

  return (
    <div>
      <Helmet>
        <title>ICGPT — On-chain Prompt Studio</title>
      </Helmet>
      <main>
        <div
          className="container-fluid text-center"
          style={{
            minHeight: '78vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
        >
          <div style={{ width: 'min(640px, 92vw)', color: '#f8f8f2' }}>
            <img
              src="onicai-icon-logo.svg"
              alt="onicai"
              style={{ height: '56px', width: 'auto', marginBottom: '14px' }}
            />
            <h1
              style={{
                fontSize: 'clamp(28px, 5vw, 40px)',
                fontWeight: 'bold',
                color: '#f1fa8c',
                margin: '0 0 12px',
                letterSpacing: '-0.01em',
              }}
            >
              ICGPT — On-chain Prompt Studio
            </h1>
            <p
              style={{
                fontSize: '17px',
                lineHeight: 1.5,
                color: '#f8f8f2',
                margin: '0 0 28px',
              }}
            >
              Optimize your prompts against LLMs running inside Internet
              Computer canisters
            </p>

            <LogInWithInternetIdentity
              setAuthClient={setAuthClient}
              label="Request early access"
            />

            <div
              style={{
                display: 'flex',
                gap: '28px',
                justifyContent: 'center',
                flexWrap: 'wrap',
                marginTop: '48px',
              }}
            >
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  setShowDocsComingSoon(true)
                }}
                style={linkStyle}
              >
                Docs →
              </a>
              <a
                href={OPENCHAT_URL}
                target="_blank"
                rel="noreferrer"
                style={linkStyle}
              >
                Join us on OpenChat →
              </a>
            </div>
          </div>
        </div>
        <Footer />
      </main>

      {showDocsComingSoon ? (
        <DocsComingSoonModal onClose={() => setShowDocsComingSoon(false)} />
      ) : null}
    </div>
  )
}

// Placeholder shown until the dedicated docs page (studio + funnAI explainer)
// is designed and built.
function DocsComingSoonModal({ onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(420px, 92vw)',
          backgroundColor: '#282a36',
          border: '1px solid #44475a',
          borderRadius: '12px',
          padding: '28px 24px',
          textAlign: 'center',
          color: '#f8f8f2',
        }}
      >
        <div style={{ fontSize: '28px', marginBottom: '10px' }}>📖</div>
        <h2
          style={{
            fontSize: '20px',
            fontWeight: 'bold',
            color: '#f1fa8c',
            margin: '0 0 10px',
          }}
        >
          Docs coming soon
        </h2>
        <p
          style={{
            fontSize: '14px',
            lineHeight: 1.6,
            color: '#6272a4',
            margin: '0 0 22px',
          }}
        >
          A full guide to the on-chain Prompt Studio and how it feeds the funnAI
          mAIners is on its way. In the meantime, join the community below.
        </p>
        <button
          type="button"
          onClick={onClose}
          style={{
            backgroundColor: '#bd93f9',
            color: '#21222c',
            border: 'none',
            borderRadius: '10px',
            padding: '10px 22px',
            fontSize: '15px',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          Got it
        </button>
      </div>
    </div>
  )
}
