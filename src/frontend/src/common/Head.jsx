// eslint-disable-next-line no-use-before-define
import React from 'react'
import { Helmet } from 'react-helmet'
import 'dracula-ui/styles/dracula-ui.css'

export function Head(props) {
  return (
    <Helmet>
      {/* Bootstrap 5: Required meta tags for proper responsive behaviors */}
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />

      <meta
        name="description"
        content="ICGPT - the OG of on-chain LLMs. Released in September 2023 as the very first app to run LLM inference on-chain, and serving on-chain LLMs on the Internet Computer ever since."
      />
      <meta
        name="keywords"
        content="on-chain LLM, on-chain AI, Internet Computer, ICP, GPT, AI, LLM, llama.cpp"
      />
      <meta name="author" content="icppWorld" />

      {/* TODO:
      <link rel="apple-touch-icon" href="logo192.png" />

      manifest.json provides metadata used when your web app is installed on a
      user's mobile device or desktop. See https://developers.google.com/web/fundamentals/web-app-manifest/ 
      <link rel="manifest" href="manifest.json" />
      */}

      <title>ICGPT - the OG of on-chain LLMs</title>
      <link rel="icon" href="favicon.ico" />
    </Helmet>
  )
}
