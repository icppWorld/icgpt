// eslint-disable-next-line no-use-before-define
import React from 'react'
import { Helmet } from 'react-helmet'
import 'dracula-ui/styles/dracula-ui.css'

export function Head(props) {
  return (
    <Helmet>
      {/* Bootstrap 5: Required meta tags for proper responsive behaviors */}
      <meta name="viewport" content="width=device-width, initial-scale=1" />

      <meta
        name="description"
        content="Internet Computer Generative Pre-trained Transformers"
      />
      <meta name="keywords" content="Internet Computer, GPT, AI, LLM" />
      <meta name="author" content="icppWorld" />

      {/* TODO:
      <link rel="apple-touch-icon" href="logo192.png" />

      manifest.json provides metadata used when your web app is installed on a
      user's mobile device or desktop. See https://developers.google.com/web/fundamentals/web-app-manifest/ 
      <link rel="manifest" href="manifest.json" />
      */}

      <title>ICGPT</title>
      <link rel="icon" href="favicon.ico" />
    </Helmet>
  )
}
