// eslint-disable-next-line no-use-before-define
import React from 'react'
import { Helmet } from 'react-helmet'
import { MotokoGreet } from './MotokoGreet'
import 'dracula-ui/styles/dracula-ui.css'
import { Box, Card, Heading } from 'dracula-ui'

export function Motoko() {
  return (
    <div>
      <Helmet>
        <title>icgpt: Motoko</title>
      </Helmet>
      <main>
        <div className="container-fluid text-center">
          <Card color="blackSecondary" my="lg" p="lg" display="inline-block">
            <Box my="sm" py="sm">
              <Heading color="yellow" size="xl">
                Demo using a Motoko backend canister...
              </Heading>
            </Box>
            <Box my="lg">
              <MotokoGreet />
            </Box>
          </Card>
        </div>
      </main>
    </div>
  )
}
