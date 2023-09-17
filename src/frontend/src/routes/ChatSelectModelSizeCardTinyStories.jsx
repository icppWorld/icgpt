// eslint-disable-next-line no-use-before-define
import React from 'react'
import 'dracula-ui/styles/dracula-ui.css'
import { Box, Button, Card, Heading, Divider, Text } from 'dracula-ui'

export function ChatSelectModelSizeCardTinyStories({
  modelSize,
  doSetModelSize,
}) {
  return (
    <Box>
      <Button
        color={modelSize === '260K' ? 'white' : 'purple'}
        size="lg"
        p="2xl"
        m="xs"
        onClick={() => doSetModelSize('260K')}
        disabled={true}
      >
        260K
      </Button>
      <Button
        color={modelSize === '15M' ? 'white' : 'purple'}
        size="lg"
        p="2xl"
        m="xs"
        onClick={() => doSetModelSize('15M')}
      >
        15M
      </Button>
      <Button
        color={modelSize === '42M' ? 'white' : 'purple'}
        size="lg"
        p="2xl"
        m="xs"
        onClick={() => doSetModelSize('42M')}
        disabled={true}
      >
        42M
      </Button>
      <Button
        color={modelSize === '110M' ? 'white' : 'purple'}
        size="lg"
        p="2xl"
        m="xs"
        onClick={() => doSetModelSize('110M')}
        disabled={true}
      >
        110M
      </Button>
    </Box>
  )
}
