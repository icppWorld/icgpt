// eslint-disable-next-line no-use-before-define
import React from 'react'
import 'dracula-ui/styles/dracula-ui.css'
import { Card, Text } from 'dracula-ui'

/*
  When implementing separate staging & production canisters, 
  selectively display this banner based on DFX_NETWORK.
  See: https://github.com/krpeacock/dfx-staging-env-example
*/
export function StagingBanner() {
  return (
    <main>
      <div className="container-fluid text-center">
        <Card variant="subtle" color="red" m="md" p="md" display="inline-block">
          <Text color="red" size="md">
            Staging environment, for internal testing purposes
          </Text>
        </Card>
      </div>
    </main>
  )
}
