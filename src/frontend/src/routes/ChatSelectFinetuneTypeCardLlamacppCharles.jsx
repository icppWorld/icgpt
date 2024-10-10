// eslint-disable-next-line no-use-before-define
import React from 'react'
import 'dracula-ui/styles/dracula-ui.css'
import { Box, Button, Card, Heading, Divider, Text } from 'dracula-ui'

export function ChatSelectFinetuneTypeCardLlamacppCharles({
  finetuneType,
  doSetFinetuneType,
}) {
  return (
    <Box>
      <Button
        color={finetuneType === 'Raw LLM' ? 'cyan' : 'white'}
        size="sm"
        p="xs"
        m="xs"
        onClick={() => doSetFinetuneType('Raw LLM')}
        disabled={false}
      >
        <Text color={finetuneType === 'Raw LLM' ? 'black' : 'black'} size="sm">
          Raw LLM
        </Text>
      </Button>
      <Button
        color={finetuneType === 'Instruct' ? 'cyan' : 'white'}
        size="sm"
        p="xs"
        m="xs"
        onClick={() => doSetFinetuneType('Instruct')}
        disabled={true}
      >
        <Text color={finetuneType === 'Instruct' ? 'black' : 'black'} size="sm">
          Instruct
        </Text>
      </Button>
    </Box>
  )
}
