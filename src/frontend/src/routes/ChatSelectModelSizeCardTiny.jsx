// eslint-disable-next-line no-use-before-define
import React from 'react'
import 'dracula-ui/styles/dracula-ui.css'
import { Box, Button, Card, Heading, Divider, Text } from 'dracula-ui'

export function ChatSelectModelSizeCardTiny({ modelSize, doSetModelSize }) {
  return (
    <Card
      id="setModelSizeCard_Tiny"
      variant="subtle"
      color="purple"
      p="md"
      m="md"
    >
      {/* <Box>
          <Text color="white">Model Size: </Text>
        </Box>

        <Divider></Divider> */}
      <Button
        color={modelSize === '260K' ? 'white' : 'purple'}
        size="lg"
        p="2xl"
        onClick={() => doSetModelSize('260K')}
      >
        260K
      </Button>
      <Button
        color={modelSize === '15M' ? 'white' : 'purple'}
        size="lg"
        p="2xl"
        onClick={() => doSetModelSize('15M')}
      >
        15M
      </Button>
      <Button
        color={modelSize === '42M' ? 'white' : 'purple'}
        size="lg"
        p="2xl"
        onClick={() => doSetModelSize('42M')}
      >
        42M
      </Button>
      <Button
        color={modelSize === '110M' ? 'white' : 'purple'}
        size="lg"
        p="2xl"
        onClick={() => doSetModelSize('110M')}
      >
        110M
      </Button>
    </Card>
  )
}
