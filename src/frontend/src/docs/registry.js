// The docs registry — single source of truth for the public /docs pages.
//
// Each entry: { slug, title, description, html, parent? }. `html` is the raw HTML
// content fragment (imported as a string via the webpack `asset/source` rule
// scoped to this folder — see webpack.config.js). This list drives the sidebar
// nav, the `/docs/:slug` routing, and each page's <Helmet> title/description.
// `parent` (optional) is another entry's slug: it renders this page as an
// indented sub-item under that one in the sidebar (keep it directly after its
// parent in the list).
//
// To ADD a page: create `<slug>.html` here, add one entry below, and add its URL
// to `src/frontend/assets/sitemap.xml`. To EDIT: change the `.html` file. Nav,
// routing and meta update automatically.

import overview from './overview.html'
import promptCostLab from './prompt-cost-lab.html'
import chat from './chat.html'
import models from './models.html'
import parameters from './parameters.html'
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
    slug: 'prompt-cost-lab',
    title: 'Prompt Cost Lab',
    description:
      'Design a repeating on-chain task, sweep its variables, and measure the exact per-request cost and quality — then compare configurations to optimize it.',
    html: promptCostLab,
  },
  {
    slug: 'chat',
    title: 'Chat',
    description:
      'A worked on-chain chat example — running a word-guessing game across models to compare exact in-canister cost, speed, and quality.',
    html: chat,
  },
  {
    slug: 'parameters',
    title: 'Chat: Parameters',
    description:
      'Tune how ICGPT samples each reply — temperature, sampling cut-offs, penalties, response length, a thinking toggle and a seed.',
    parent: 'chat',
    html: parameters,
  },
  {
    slug: 'models',
    title: 'Models',
    description:
      'The five on-chain models ICGPT serves — from Gemma-3-270M to Qwen3-1.7B (plus LFM2.5-1.2B) — each in its own Internet Computer canister, listed lightest to largest.',
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
