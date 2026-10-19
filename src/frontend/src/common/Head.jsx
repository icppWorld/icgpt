import 'dracula-ui/styles/dracula-ui.css'

// NOTE: the viewport, description, keywords, author, canonical, favicon and the
//       Open Graph / Twitter card tags all live in src/frontend/src/index.html.
//
//       They belong in the static html, because social & search crawlers do not
//       run our JavaScript, so anything React injects at runtime is
//       invisible to them. Repeating them here would also give every page two
//       copies of each tag, since React 19 hoists rendered <meta> tags into <head>
//       next to the static ones without deduplicating them.
//
//       The <title> is per route: React 19 hoists it into <head>.
export function Head() {
  return <title>ICGPT — On-chain Prompt Studio</title>
}
