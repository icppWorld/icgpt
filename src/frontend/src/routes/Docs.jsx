// eslint-disable-next-line no-use-before-define
import React from 'react'
import { Helmet } from 'react-helmet'
import 'dracula-ui/styles/dracula-ui.css'
import { Card, Heading } from 'dracula-ui'

export function Docs() {
  return (
    <div>
      <Helmet>
        <title>ICGPT</title>
      </Helmet>
      <main>
        <div className="container-fluid">
          <Card color="animated" my="lg" p="lg" display="inline-block">
            <Heading color="black" size="xl">
              There's nothing here (yet)...!
            </Heading>
          </Card>
        </div>
      </main>
    </div>
  )
}
