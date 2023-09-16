// eslint-disable-next-line no-use-before-define
import React from 'react'
import { Helmet } from 'react-helmet'
import 'dracula-ui/styles/dracula-ui.css'
import { Box, Button, Card, Heading, Text, Divider } from 'dracula-ui'
import { ImageWithFallback } from '../common/ImageWithFallback'
import { floatingStyleTop } from '../common/styles'

export function WaitAnimation({ message }) {
  return (
    <Card
      variant="subtle"
      color="purple"
      p="md"
      m="md"
      style={floatingStyleTop}
    >
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
  )
}
