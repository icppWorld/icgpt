// eslint-disable-next-line no-use-before-define
import React from 'react'
import 'dracula-ui/styles/dracula-ui.css'
import { Card, Heading } from 'dracula-ui'

export function NothingHere() {
  return (
    <main>
      <div className="container-fluid text-center">
        <Card color="animated" my="lg" p="lg" display="inline-block">
          <Heading color="black" size="xl">
            There's nothing here (yet)...!
          </Heading>
        </Card>
      </div>
    </main>
  )
}
