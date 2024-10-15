// eslint-disable-next-line no-use-before-define
import React from 'react'
import 'dracula-ui/styles/dracula-ui.css'
import { Box, Button, Card, Heading, Divider, Text } from 'dracula-ui'

import { ChatSelectModelSizeCardTinyStories } from './ChatSelectModelSizeCardTinyStories'
import { ChatSelectModelSizeCardQwen2_5 } from './ChatSelectModelSizeCardQwen2_5'
import { ChatSelectModelSizeCardLlamacppCharles } from './ChatSelectModelSizeCardLlamacppCharles'
import { ChatSelectFinetuneTypeCardTinyStories } from './ChatSelectFinetuneTypeCardTinyStories'
import { ChatSelectFinetuneTypeCardQwen2_5 } from './ChatSelectFinetuneTypeCardQwen2_5'
import { ChatSelectFinetuneTypeCardLlamacppCharles } from './ChatSelectFinetuneTypeCardLlamacppCharles'

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
      doSetModelSize('42M')
      doSetFinetuneType('Raw LLM')
    } else if (type === 'Qwen2.5') {
      doSetModelSize('0.5b_q8_0')
      doSetFinetuneType('Instruct')
    } else if (type === 'llama.cpp Charles') {
      doSetModelSize('42M')
      doSetFinetuneType('Raw LLM')
    }

    doSetInputPlaceholder()
  }

  function doSetModelSize(size) {
    const handleSetModelSize = (size_) => {
      setModelSize(size_) // update parent's state
    }
    handleSetModelSize(size)
    doSetInputPlaceholder()
  }

  function doSetFinetuneType(type) {
    const handleSetFinetuneType = (finetuneType) => {
      setFinetuneType(finetuneType) // update parent's state
    }
    handleSetFinetuneType(type)
    doSetInputPlaceholder()
  }

  function doSetInputPlaceholder() {
    const handleSetInputPlaceholder = (placeholder) => {
      setInputPlaceholder(placeholder) // update parent's state
    }
    let placeholder = 'Send a message'
    if (finetuneType === 'Raw LLM') {
      if (modelType === 'TinyStories') {
        placeholder = 'Start your story (pretend to be 4 years old)'
      } else if (modelType === 'Qwen2.5') {
        placeholder = 'Start a sentence and I will continue it'
      } else if (modelType === 'llama.cpp Charles') {
        placeholder = 'Start your story (pretend to be 4 years old)'
      }
    } else if (finetuneType === 'Instruct') {
      if (modelType === 'TinyStories') {
        placeholder = 'Describe your story (pretend to be 4 years old)'
      } else if (modelType === 'Qwen2.5') {
        placeholder = 'Message ICGPT'
      } else if (modelType === 'llama.cpp Charles') {
        placeholder = 'Describe your story (pretend to be 4 years old)'
      }
    }
    handleSetInputPlaceholder(placeholder)
  }

  return (
    <Card
      id="setModelTypeCard"
      variant="subtle"
      color="black"
      p="none"
      m="none"
    >
      <Box>
        <Text color="white">model data: </Text>
        <Box>
          <Button
            color={modelType === 'TinyStories' ? 'cyan' : 'white'}
            size="sm"
            p="xs"
            m="xs"
            onClick={() => doSetModelType('TinyStories')}
          >
            <Text
              color={modelType === 'TinyStories' ? 'black' : 'black'}
              size="sm"
            >
              TinyStories
            </Text>
          </Button>

          <Button
            color={modelType === 'Qwen2.5' ? 'cyan' : 'white'}
            size="sm"
            p="xs"
            m="xs"
            onClick={() => doSetModelType('Qwen2.5')}
            disabled={false}
          >
            <Text color={modelType === 'Qwen2.5' ? 'black' : 'black'} size="sm">
              llama.cpp Qwen2.5
            </Text>
          </Button>

          {/* <Button
            color={modelType === 'llama.cpp Charles' ? 'cyan' : 'white'}
            size="sm"
            p="xs"
            m="xs"
            onClick={() => doSetModelType('llama.cpp Charles')}
            disabled={false}
          >
            <Text
              color={modelType === 'llama.cpp Charles' ? 'black' : 'black'}
              size="sm"
            >
              llama.cpp Charles
            </Text>
          </Button> */}
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
        ) : modelType === 'Qwen2.5' ? (
          <ChatSelectModelSizeCardQwen2_5
            modelSize={modelSize}
            doSetModelSize={doSetModelSize}
          />
        ) : modelType === 'llama.cpp Charles' ? (
          <ChatSelectModelSizeCardLlamacppCharles
            modelSize={modelSize}
            doSetModelSize={doSetModelSize}
          />
        ) : null}
      </Box>

      <Divider></Divider>

      <Box>
        <Text color="white">finetune type: </Text>
        {modelType === 'TinyStories' ? (
          <ChatSelectFinetuneTypeCardTinyStories
            finetuneType={finetuneType}
            doSetFinetuneType={doSetFinetuneType}
          />
        ) : modelType === 'Qwen2.5' ? (
          <ChatSelectFinetuneTypeCardQwen2_5
            finetuneType={finetuneType}
            doSetFinetuneType={doSetFinetuneType}
          />
        ) : modelType === 'llama.cpp Charles' ? (
          <ChatSelectFinetuneTypeCardLlamacppCharles
            finetuneType={finetuneType}
            doSetFinetuneType={doSetFinetuneType}
          />
        ) : null}
      </Box>
    </Card>
  )
}
