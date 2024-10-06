// eslint-disable-next-line no-use-before-define
import React from 'react'
import 'dracula-ui/styles/dracula-ui.css'
import { Box, Button, Card, Heading, Divider, Text } from 'dracula-ui'

export function ChatSelectModelSizeCardQwen2_5({ modelSize, doSetModelSize }) {
  return (
    <Box>
      <Button
        color={modelSize === '0.5b_q4_k_m' ? 'cyan' : 'white'}
        size="sm"
        p="xs"
        m="xs"
        onClick={() => doSetModelSize('0.5b_q4_k_m')}
        disabled={false}
      >
        <Text color={modelSize === '0.5b_q4_k_m' ? 'black' : 'black'} size="sm">
          0.5b_q4_k_m
        </Text>
      </Button>
      <Button
        color={modelSize === '0.5b_q8_0' ? 'cyan' : 'white'}
        size="sm"
        p="xs"
        m="xs"
        onClick={() => doSetModelSize('0.5b_q8_0')}
        disabled={false}
      >
        <Text color={modelSize === '0.5b_q8_0' ? 'black' : 'black'} size="sm">
          0.5b_q8_0
        </Text>
      </Button>
    </Box>
  )
}
