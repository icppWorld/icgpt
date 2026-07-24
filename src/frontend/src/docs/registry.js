// The docs registry — single source of truth for the public /docs pages.
//
// Each entry: { slug, title, description, html }. `html` is the raw HTML content
// fragment (imported as a string via the webpack `asset/source` rule scoped to
// this folder — see webpack.config.js). This list drives the sidebar nav, the
// `/docs/:slug` routing, and each page's <Helmet> title/description.
//
// To ADD a page: create `<slug>.html` here, add one entry below, and add its URL
// to `src/frontend/assets/sitemap.xml`. To EDIT: change the `.html` file. Nav,
// routing and meta update automatically.

import overview from './overview.html'
import howItWorks from './how-it-works.html'
import models from './models.html'
import earlyAccess from './early-access.html'

export const DOCS = [
  {
    slug: 'overview',
    title: 'Overview',
    description:
      'ICGPT is a studio to optimize your prompts against LLMs running on-chain, inside Internet Computer canisters.',
    html: overview,
  },
  {
    slug: 'how-it-works',
    title: 'How it works',
    description:
      'How ICGPT runs real LLMs fully in-canister on the Internet Computer, and measures exact on-chain cost & speed.',
    html: howItWorks,
  },
  {
    slug: 'models',
    title: 'Models',
    description:
      'The on-chain models ICGPT serves — Qwen3-0.6B (default) and Qwen2.5-0.5B, each in its own Internet Computer canister.',
    html: models,
  },
  {
    slug: 'early-access',
    title: 'Early access',
    description:
      'How to request early access to the ICGPT on-chain prompt studio, and join the onicai OpenChat community.',
    html: earlyAccess,
  },
]

export function getDoc(slug) {
  return DOCS.find((d) => d.slug === slug)
}
