// eslint-disable-next-line no-use-before-define
import React from 'react'
import 'dracula-ui/styles/dracula-ui.css'
import { Box, Button, Card, Heading, Divider, Text } from 'dracula-ui'

export function ChatSelectModelSizeCardQwen2_5({ modelSize, doSetModelSize }) {
  return (
    <Box>
      <Button
        color={modelSize === '0.5B' ? 'cyan' : 'white'}
        size="sm"
        p="xs"
        m="xs"
        onClick={() => doSetModelSize('0.5B')}
        disabled={false}
      >
        <Text color={modelSize === '0.5B' ? 'black' : 'black'} size="sm">
          0.5B
        </Text>
      </Button>
      <Button
        color={modelSize === '1.5B' ? 'cyan' : 'white'}
        size="sm"
        p="xs"
        m="xs"
        onClick={() => doSetModelSize('1.5B')}
        disabled={true}
      >
        <Text color={modelSize === '1.5B' ? 'black' : 'black'} size="sm">
          1.5B
        </Text>
      </Button>
      <Button
        color={modelSize === '3B' ? 'cyan' : 'white'}
        size="sm"
        p="xs"
        m="xs"
        onClick={() => doSetModelSize('3B')}
        disabled={true}
      >
        <Text color={modelSize === '3B' ? 'black' : 'black'} size="sm">
          3B
        </Text>
      </Button>
      <Button
        color={modelSize === '7B' ? 'cyan' : 'white'}
        size="sm"
        p="xs"
        m="xs"
        onClick={() => doSetModelSize('7B')}
        disabled={true}
      >
        <Text color={modelSize === '7B' ? 'black' : 'black'} size="sm">
          7B
        </Text>
      </Button>
      <Button
        color={modelSize === '32B' ? 'cyan' : 'white'}
        size="sm"
        p="xs"
        m="xs"
        onClick={() => doSetModelSize('32B')}
        disabled={true}
      >
        <Text color={modelSize === '32B' ? 'black' : 'black'} size="sm">
          32B
        </Text>
      </Button>
      <Button
        color={modelSize === '72B' ? 'cyan' : 'white'}
        size="sm"
        p="xs"
        m="xs"
        onClick={() => doSetModelSize('72B')}
        disabled={true}
      >
        <Text color={modelSize === '72B' ? 'black' : 'black'} size="sm">
          72B
        </Text>
      </Button>
    </Box>
  )
}
