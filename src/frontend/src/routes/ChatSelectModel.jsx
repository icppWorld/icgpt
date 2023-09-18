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
    <Card id="setModelTypeCard" variant="subtle" color="black" p="none" m="none">
      <Box>
        <Text color="white">model data: </Text>
        <Box>
          <Button
            color={modelType === 'TinyStories' ? 'white' : 'purple'}
            size="sm"
            p="xs"
            m="xs"
            onClick={() => doSetModelType('TinyStories')}
          >
            <Text
              color={modelType === 'TinyStories' ? 'purple' : 'wite'}
              size="sm"
            >
              TinyStories
            </Text>
          </Button>
          <Button
            color={modelType === 'llama2' ? 'white' : 'purple'}
            size="sm"
            p="xs"
            m="xs"
            onClick={() => doSetModelType('llama2')}
            disabled={true}
          >
            <Text color={modelType === 'llama2' ? 'purple' : 'wite'} size="sm">
              llama2
            </Text>
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
            size="sm"
            p="xs"
            m="xs"
            onClick={() => doSetFinetuneType('LLM')}
          >
            <Text color={modelType === 'LLM' ? 'purple' : 'wite'} size="sm">
              LLM
            </Text>
          </Button>
          <Button
            color={finetuneType === 'Chat' ? 'white' : 'purple'}
            size="sm"
            p="xs"
            m="xs"
            onClick={() => doSetFinetuneType('Chat')}
            disabled={true}
          >
            <Text color={modelType === 'Chat' ? 'purple' : 'wite'} size="sm">
              Chat
            </Text>
          </Button>
        </Box>
      </Box>
    </Card>
  )
}
