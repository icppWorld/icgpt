// eslint-disable-next-line no-use-before-define
import React from 'react'
import { Helmet } from 'react-helmet'
import 'dracula-ui/styles/dracula-ui.css'

import { Footer } from '../common/Footer'
import { LogInWithInternetIdentity } from './LoginWithInternetIdentity'

const FUNNAI_URL = 'https://funnai.onicai.com'
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
              src="loop.svg"
              alt="ICGPT"
              style={{ width: '64px', height: '64px', marginBottom: '10px' }}
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
                margin: '0 0 14px',
              }}
            >
              Design, test &amp; refine your prompts against a real LLM —
              running verifiably inside Internet Computer canisters.
            </p>
            <p
              style={{
                fontSize: '15px',
                lineHeight: 1.6,
                color: '#6272a4',
                margin: '0 auto 26px',
                maxWidth: '540px',
              }}
            >
              It&apos;s the same on-chain LLM the{' '}
              <strong style={{ color: '#bd93f9' }}>funnAI mAIners</strong> run —
              so what you see here is what they&apos;ll produce. Get your
              prompts ready for the{' '}
              <strong style={{ color: '#bd93f9' }}>funnAI task board</strong>{' '}
              (coming soon), where you&apos;ll post AI tasks for mAIners to
              solve.
            </p>

            <LogInWithInternetIdentity
              setAuthClient={setAuthClient}
              label="Request early access"
            />

            <p
              style={{
                fontSize: '12.5px',
                lineHeight: 1.6,
                color: '#6272a4',
                margin: '28px auto 0',
                maxWidth: '540px',
              }}
            >
              funnAI is live on-chain AI mining: buy a mAIner, top it up with
              cycles, and it does AI work on-chain. The Proof-of-AI-Work
              protocol verifiably tracks every result and an on-chain Judge LLM
              ranks them — winners earn freshly-minted{' '}
              <strong style={{ color: '#50fa7b' }}>FUNNAI</strong> tokens.
            </p>

            <div
              style={{
                display: 'flex',
                gap: '20px',
                justifyContent: 'center',
                flexWrap: 'wrap',
                marginTop: '16px',
              }}
            >
              <a
                href={FUNNAI_URL}
                target="_blank"
                rel="noreferrer"
                style={linkStyle}
              >
                funnAI — live on-chain AI mining →
              </a>
              <a
                href={OPENCHAT_URL}
                target="_blank"
                rel="noreferrer"
                style={linkStyle}
              >
                Join the onicai community on OpenChat →
              </a>
            </div>
          </div>
        </div>
        <Footer />
      </main>
    </div>
  )
}
