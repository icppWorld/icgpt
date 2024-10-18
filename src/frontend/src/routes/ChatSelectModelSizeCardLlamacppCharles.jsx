// eslint-disable-next-line no-use-before-define
import React from 'react'
import 'dracula-ui/styles/dracula-ui.css'
import { Box, Button, Card, Heading, Divider, Text } from 'dracula-ui'

export function ChatSelectModelSizeCardLlamacppCharles({
  modelSize,
  doSetModelSize,
}) {
  return (
    <Box>
      <Button
        color={modelSize === '42M' ? 'cyan' : 'white'}
        size="sm"
        p="xs"
        m="xs"
        onClick={() => doSetModelSize('42M')}
        disabled={false}
      >
        <Text color={modelSize === '42M' ? 'black' : 'black'} size="sm">
          42M
        </Text>
      </Button>
    </Box>
  )
}
