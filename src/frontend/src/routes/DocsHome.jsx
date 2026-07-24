// eslint-disable-next-line no-use-before-define
import React from 'react'
import { Helmet } from 'react-helmet'
import { Link } from 'react-router-dom'
import { DOCS } from '../docs/registry'

// The /docs landing: a short intro + a grid of section cards from the registry.
export function DocsHome() {
  const card = {
    display: 'block',
    textDecoration: 'none',
    backgroundColor: '#21222c',
    border: '1px solid #44475a',
    borderRadius: '10px',
    padding: '16px 18px',
  }

  return (
    <div>
      <Helmet>
        <title>ICGPT Docs — On-chain Prompt Studio</title>
        <meta
          name="description"
          content="Documentation for ICGPT, the on-chain Prompt Studio: how it works and the models running inside Internet Computer canisters."
        />
      </Helmet>

      <h1
        style={{
          fontSize: 'clamp(28px, 5vw, 38px)',
          fontWeight: 800,
          color: '#f1fa8c',
          margin: '0 0 10px',
          letterSpacing: '-0.01em',
        }}
      >
        ICGPT Documentation
      </h1>
      <p
        style={{
          fontSize: '17px',
          lineHeight: 1.6,
          color: '#c7cbe0',
          margin: '0 0 28px',
          maxWidth: '640px',
        }}
      >
        Optimize your prompts against LLMs running inside Internet Computer
        canisters.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: '14px',
        }}
      >
        {DOCS.map((d) => (
          <Link key={d.slug} to={`/docs/${d.slug}`} style={card}>
            <div
              style={{
                fontWeight: 700,
                fontSize: '16px',
                color: '#8be9fd',
                marginBottom: '6px',
              }}
            >
              {d.title} →
            </div>
            <div
              style={{ fontSize: '13.5px', lineHeight: 1.5, color: '#9aa0bd' }}
            >
              {d.description}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
