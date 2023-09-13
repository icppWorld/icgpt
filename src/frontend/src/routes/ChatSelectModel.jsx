// eslint-disable-next-line no-use-before-define
import React from 'react'
import 'dracula-ui/styles/dracula-ui.css'
import { Box, Button, Card, Heading, Divider, Text } from 'dracula-ui'

import { ChatSelectModelSizeCardTinyStories } from './ChatSelectModelSizeCardTinyStories'
import { ChatSelectModelSizeCardLlama2 } from './ChatSelectModelSizeCardLlama2'

export function ChatSelectModel({
  modelType,
  setModelType,
  modelSize,
  setModelSize,
  finetuneType,
  setFinetuneType,
  inputPlaceholder,
  setInputPlaceholder,
}) {
  function print_state() {
    console.log('------------------------------------')
    console.log('modelType         : ' + modelType)
    console.log('modelSize         : ' + modelSize)
    console.log('finetuneType      : ' + finetuneType)
    console.log('inputPlaceholder  : ' + inputPlaceholder)
  }

  // state updates are asynchronous, so call dependent ones with useEffect
  React.useEffect(() => {
    print_state()
  }, [modelType, modelSize, finetuneType, inputPlaceholder])

  React.useEffect(() => {
    doSetInputPlaceholder()
  }, [modelType, finetuneType])

  function doSetModelType(type) {
    const handleSetModelType = (type_) => {
      setModelType(type_) // update parent's state
    }
    handleSetModelType(type)

    // Setting the default modelSize based on the modelType
    if (type === 'TinyStories') {
      doSetModelSize('15M')
    } else if (type === 'llama2') {
      doSetModelSize('7B')
    }
  }

  function doSetModelSize(size) {
    const handleSetModelSize = (size_) => {
      setModelSize(size_) // update parent's state
    }
    handleSetModelSize(size)
  }

  function doSetFinetuneType(type) {
    const handleSetFinetuneType = (finetuneType) => {
      setFinetuneType(finetuneType) // update parent's state
    }
    handleSetFinetuneType(type)
  }

  function doSetInputPlaceholder() {
    const handleSetInputPlaceholder = (placeholder) => {
      setInputPlaceholder(placeholder) // update parent's state
    }
    let placeholder = 'Send a message'
    if (finetuneType === 'LLM') {
      if (modelType === 'TinyStories') {
        placeholder = 'Start your story (pretend to be 4 years old...)'
      } else if (modelType === 'llama2') {
        placeholder = 'Start your sentence...'
      }
    }
    handleSetInputPlaceholder(placeholder)
  }

  return (
    <Box>
      <Card id="setModelTypeCard" variant="subtle" color="purple" p="md" m="md">
        <Box>
          <Text color="white">model data: </Text>
          <Box>
            <Button
              color={modelType === 'TinyStories' ? 'white' : 'purple'}
              size="lg"
              p="2xl"
              onClick={() => doSetModelType('TinyStories')}
            >
              TinyStories
            </Button>
            <Button
              color={modelType === 'llama2' ? 'white' : 'purple'}
              size="lg"
              p="2xl"
              onClick={() => doSetModelType('llama2')}
            >
              llama2
            </Button>
          </Box>
        </Box>

        <Divider></Divider>

        <Box>
          <Text color="white">model size: </Text>
          {modelType === 'TinyStories' ? (
            <ChatSelectModelSizeCardTinyStories
              modelSize={modelSize}
              doSetModelSize={doSetModelSize}
            />
          ) : modelType === 'llama2' ? (
            <ChatSelectModelSizeCardLlama2
              modelSize={modelSize}
              doSetModelSize={doSetModelSize}
            />
          ) : null}
        </Box>

        <Divider></Divider>

        <Box>
          <Text color="white">finetuned: </Text>
          <Box>
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
          </Box>
        </Box>

      </Card>
    </Box>
  )
}
