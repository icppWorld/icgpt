// eslint-disable-next-line no-use-before-define
import React from 'react'
import { Helmet } from 'react-helmet'
import 'dracula-ui/styles/dracula-ui.css'
import { Box, Button, Card, Heading, Text, Divider } from 'dracula-ui'
import { ImageWithFallback } from '../common/ImageWithFallback'

export function WaitAnimation({ message }) {
  return (
    <div>
      <Helmet>
        <title>ICGPT: Login</title>
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
              ICGPT Labs
            </Heading>
            <Divider></Divider>
            <Box>
              <Card variant="subtle" color="purple" p="md" m="md">
                <ImageWithFallback
                  src="loader.webp"
                  fallback="loader.gif"
                  alt="DFINITY Astronaut Logo"
                />

                <Divider></Divider>

                <Box>
                  <Text color="white">{message}</Text>
                </Box>
              </Card>
            </Box>
          </Card>
        </div>
      </main>
    </div>
  )
}
