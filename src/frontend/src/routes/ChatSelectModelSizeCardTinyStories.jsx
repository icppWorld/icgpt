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
        color={modelSize === '260K' ? 'cyan' : 'white'}
        size="sm"
        p="2xl"
        m="xs"
        onClick={() => doSetModelSize('260K')}
        disabled={false}
      >
        <Text color={modelSize === '260K' ? 'black' : 'black'} size="sm">
          260K
        </Text>
      </Button>
      <Button
        color={modelSize === '15M' ? 'cyan' : 'white'}
        size="sm"
        p="2xl"
        m="xs"
        onClick={() => doSetModelSize('15M')}
      >
        <Text color={modelSize === '15M' ? 'black' : 'black'} size="sm">
          15M
        </Text>
      </Button>
      <Button
        color={modelSize === '42M' ? 'cyan' : 'white'}
        size="sm"
        p="2xl"
        m="xs"
        onClick={() => doSetModelSize('42M')}
        disabled={false}
      >
        <Text color={modelSize === '42M' ? 'black' : 'black'} size="sm">
          42M
        </Text>
      </Button>
      <Button
        color={modelSize === '110M' ? 'cyan' : 'white'}
        size="sm"
        p="2xl"
        m="xs"
        onClick={() => doSetModelSize('110M')}
        disabled={true}
      >
        <Text color={modelSize === '110M' ? 'black' : 'black'} size="sm">
          110M
        </Text>
      </Button>
    </Box>
  )
}
