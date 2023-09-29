// eslint-disable-next-line no-use-before-define
import React from 'react'
import 'dracula-ui/styles/dracula-ui.css'
import { Box, Button, Card, Heading, Divider, Text } from 'dracula-ui'

export function ChatSelectModelSizeCardLlama2({ modelSize, doSetModelSize }) {
  return (
    <Box>
      <Button
        color={modelSize === '7B' ? 'cyan' : 'white'}
        size="sm"
        p="xs"
        m="xs"
        onClick={() => doSetModelSize('7B')}
      >
        <Text color={modelSize === '7B' ? 'black' : 'black'} size="sm">
          7B
        </Text>
      </Button>
      <Button
        color={modelSize === '13B' ? 'cyan' : 'white'}
        size="sm"
        p="xs"
        m="xs"
        onClick={() => doSetModelSize('13B')}
      >
        <Text color={modelSize === '13B' ? 'black' : 'black'} size="sm">
          13B
        </Text>
      </Button>
      <Button
        color={modelSize === '70B' ? 'cyan' : 'white'}
        size="sm"
        p="xs"
        m="xs"
        onClick={() => doSetModelSize('70B')}
      >
        <Text color={modelSize === '70B' ? 'black' : 'black'} size="sm">
          70B
        </Text>
      </Button>
    </Box>
  )
}
