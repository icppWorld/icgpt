// eslint-disable-next-line no-use-before-define
import React from 'react'
import { Helmet } from 'react-helmet'
import 'dracula-ui/styles/dracula-ui.css'

// NOTE: the viewport, description, keywords, author, canonical, favicon and the
//       Open Graph / Twitter card tags all live in src/frontend/src/index.html.
//
//       They belong in the static html, because social & search crawlers do not
//       run our JavaScript, so anything react-helmet injects at runtime is
//       invisible to them. Repeating them here would also give every page two
//       copies of each tag, since react-helmet only replaces the tags that it
//       manages itself.
//
//       react-helmet stays in charge of the <title>, which is per route.
export function Head() {
  return (
    <Helmet>
      <title>ICGPT - the OG of on-chain LLMs</title>
    </Helmet>
  )
}
