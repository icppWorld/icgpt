// eslint-disable-next-line no-use-before-define
import React from 'react'
import { Helmet } from 'react-helmet'
import { Link } from 'react-router-dom'
import 'dracula-ui/styles/dracula-ui.css'

import { Footer } from '../common/Footer'
import { LogInWithInternetIdentity } from './LoginWithInternetIdentity'

const OPENCHAT_URL =
  'https://oc.app/community/mepna-eqaaa-aaaar-bclua-cai/channel/2881126157'

export function Login({ setAuthClient }) {
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

            {/* Demo movie: Gemma-3-270M running on-chain. H.264/AAC in an MP4
                container, served as a static asset (see webpack CopyPlugin). */}
            <div style={{ marginTop: '40px' }}>
              <p
                style={{
                  fontSize: '13px',
                  color: '#6272a4',
                  margin: '0 0 10px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                ▶ Watch it run — Gemma-3-270M on-chain
              </p>
              <video
                src="/video/gemma.mp4"
                controls
                playsInline
                preload="metadata"
                style={{
                  width: '100%',
                  height: 'auto',
                  borderRadius: '12px',
                  border: '1px solid #44475a',
                  boxShadow: '0 10px 34px rgba(0, 0, 0, 0.45)',
                  display: 'block',
                }}
              >
                Your browser does not support the video tag.
              </video>
            </div>

            <div
              style={{
                display: 'flex',
                gap: '28px',
                justifyContent: 'center',
                flexWrap: 'wrap',
                marginTop: '48px',
              }}
            >
              <Link to="/docs" style={linkStyle}>
                Docs →
              </Link>
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
    </div>
  )
}
