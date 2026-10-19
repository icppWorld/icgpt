import { useParams, Link } from 'react-router'
import { getDoc } from '../docs/registry'
import { DocsContent } from '../docs/DocsContent'

// Renders one docs page for /docs/:slug. Looks the slug up in the registry,
// sets its <title>/description, and renders the HTML fragment.
export function DocsPage() {
  const { slug } = useParams()
  const doc = getDoc(slug)

  if (!doc) {
    return (
      <div>
        <title>Not found — ICGPT Docs</title>
        <h1 style={{ color: '#f1fa8c', fontWeight: 800 }}>Page not found</h1>
        <p style={{ color: '#c7cbe0' }}>
          That docs page doesn&apos;t exist.{' '}
          <Link to="/docs" style={{ color: '#8be9fd' }}>
            Back to docs →
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* React 19 needs a single string child in <title>, not text + expression. */}
      <title>{`${doc.title} — ICGPT Docs`}</title>
      <meta name="description" content={doc.description} />

      <DocsContent html={doc.html} />

      <div
        style={{
          marginTop: '36px',
          paddingTop: '16px',
          borderTop: '1px solid #44475a',
          fontSize: '14px',
        }}
      >
        <Link to="/docs" style={{ color: '#6272a4', textDecoration: 'none' }}>
          ← All docs
        </Link>
      </div>
    </div>
  )
}
