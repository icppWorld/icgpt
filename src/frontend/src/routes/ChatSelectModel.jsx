// eslint-disable-next-line no-use-before-define
import React from 'react'
import 'dracula-ui/styles/dracula-ui.css'
import { Box, Button, Card, Heading, Divider, Text } from 'dracula-ui'

import { ChatSelectModelSizeCardTiny } from './ChatSelectModelSizeCardTiny'
import { ChatSelectModelSizeCardLlama2 } from './ChatSelectModelSizeCardLlama2'

export function ChatSelectModel({
  modelType,
  setModelType,
  modelSize,
  setModelSize,
  finetuneType,
  setFinetuneType,
}) {
  async function doSetModelType(type) {
    const handleSetModelType = (modelType) => {
      setModelType(modelType) // update parent's state
      console.log('modelType  : ' + modelType)
    }
    handleSetModelType(type)

    // Setting the default modelSize based on the modelType
    if (type === 'Tiny') {
      doSetModelSize('15M')
    } else if (type === 'llama2') {
      doSetModelSize('7B')
    }
  }

  async function doSetModelSize(size) {
    const handleSetModelSize = (modelSize) => {
      setModelSize(modelSize) // update parent's state
      console.log('modelSize  : ' + modelSize)
    }
    handleSetModelSize(size)
  }

  async function doSetFinetuneType(type) {
    const handleSetFinetuneType = (finetuneType) => {
      setFinetuneType(finetuneType) // update parent's state
      console.log('finetuneType  : ' + finetuneType)
    }
    handleSetFinetuneType(type)
  }

  return (
    <Box>
      <Card id="setModelTypeCard" variant="subtle" color="purple" p="md" m="md">
        {/* <Box>
          <Text color="white">Model: </Text>
        </Box>

        <Divider></Divider> */}
        <Button
          color={modelType === 'Tiny' ? 'white' : 'purple'}
          size="lg"
          p="2xl"
          onClick={() => doSetModelType('Tiny')}
        >
          Tiny
        </Button>
        <Button
          color={modelType === 'llama2' ? 'white' : 'purple'}
          size="lg"
          p="2xl"
          onClick={() => doSetModelType('llama2')}
        >
          llama2
        </Button>
      </Card>

      {modelType === 'Tiny' ? (
        <ChatSelectModelSizeCardTiny
          modelSize={modelSize}
          doSetModelSize={doSetModelSize}
        />
      ) : modelType === 'llama2' ? (
        <ChatSelectModelSizeCardLlama2
          modelSize={modelSize}
          doSetModelSize={doSetModelSize}
        />
      ) : null}

      <Card
        id="setFinetuneTypeCard"
        variant="subtle"
        color="purple"
        p="md"
        m="md"
      >
        <Box>
          <Text color="white">Finetune: </Text>
        </Box>

        <Divider></Divider>
        <Button
          color={finetuneType === 'LLM' ? 'white' : 'purple'}
          size="lg"
          p="2xl"
          onClick={() => doSetFinetuneType('LLM')}
        >
          LLM
        </Button>
        <Button
          color={finetuneType === 'Chat' ? 'white' : 'purple'}
          size="lg"
          p="2xl"
          onClick={() => doSetFinetuneType('Chat')}
        >
          Chat
        </Button>
      </Card>
    </Box>
  )
}
