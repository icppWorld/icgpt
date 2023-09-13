// eslint-disable-next-line no-use-before-define
import React from 'react'
import { Helmet } from 'react-helmet'
import { useOutletContext } from 'react-router-dom'
import 'dracula-ui/styles/dracula-ui.css'
import { Box, Card, Divider, Heading, Text } from 'dracula-ui'

export function Home() {
  const [authClient, setAuthClient] = useOutletContext()

  const identity = authClient.getIdentity()
  const principal = identity.getPrincipal()
  //   console.log('principal  : ' + principal)
  return (
    <div>
      <Helmet>
        <title>ICGPT: Home</title>
      </Helmet>
      <main>
        <div className="container-fluid text-center">
          <Card
            variant="subtle"
            color="none"
            my="sm"
            p="sm"
            display="inline-block"
          >
            <Heading color="white" size="xl">
              Hello!
            </Heading>
            <Text color="yellow" size="xs">
              {principal.toString()}
            </Text>
            <Divider></Divider>
            <Card variant="subtle" color="purple" p="md" m="md">
              <Box>
                <Text color="white">
                  Start your Tiny Story, and let our AI complete it !
                </Text>
              </Box>
            </Card>
          </Card>
        </div>
      </main>
    </div>
  )
}
