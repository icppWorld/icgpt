// eslint-disable-next-line no-use-before-define
import React from 'react'
import 'dracula-ui/styles/dracula-ui.css'
import { Box, Button, Card, Heading, Divider, Text } from 'dracula-ui'

export function ChatSelectModel({
  modelType,
  setModelType,
  promptType,
  setPromptType,
  modelSize,
  setModelSize,
}) {
  async function doSetModelType(type) {
    const handleSetModelType = (modelType) => {
      setModelType(modelType) // update parent's state
      console.log('modelType  : ' + modelType)
    }
    handleSetModelType(type)
  }

  async function doSetPromptType(type) {
    const handleSetPromptType = (promptType) => {
      setPromptType(promptType) // update parent's state
      console.log('promptType  : ' + promptType)
    }
    handleSetPromptType(type)
  }

  async function doSetModelSize(size) {
    const handleSetModelSize = (modelSize) => {
      setModelSize(modelSize) // update parent's state
      console.log('modelSize  : ' + modelSize)
    }
    handleSetModelSize(size)
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

      <Card
        id="setModelSizeCard_TinyStories"
        variant="subtle"
        color="purple"
        p="md"
        m="md"
      >
        {/* <Box>
          <Text color="white">Model Size: </Text>
        </Box>

        <Divider></Divider> */}
        <Button
          color={modelSize === '260K' ? 'white' : 'purple'}
          size="lg"
          p="2xl"
          onClick={() => doSetModelSize('260K')}
        >
          260K
        </Button>
        <Button
          color={modelSize === '15M' ? 'white' : 'purple'}
          size="lg"
          p="2xl"
          onClick={() => doSetModelSize('15M')}
        >
          15M
        </Button>
        <Button
          color={modelSize === '42M' ? 'white' : 'purple'}
          size="lg"
          p="2xl"
          onClick={() => doSetModelSize('42M')}
        >
          42M
        </Button>
        <Button
          color={modelSize === '110M' ? 'white' : 'purple'}
          size="lg"
          p="2xl"
          onClick={() => doSetModelSize('110M')}
        >
          110M
        </Button>
      </Card>

      <Card
        id="setPromptTypeCard"
        variant="subtle"
        color="purple"
        p="md"
        m="md"
      >
        {/* <Box>
          <Text color="white">Prompt Type: </Text>
        </Box>

        <Divider></Divider> */}
        <Button
          color={promptType === 'Chat' ? 'white' : 'purple'}
          size="lg"
          p="2xl"
          onClick={() => doSetPromptType('Chat')}
        >
          Chat
        </Button>
        <Button
          color={promptType === 'Continue' ? 'white' : 'purple'}
          size="lg"
          p="2xl"
          onClick={() => doSetPromptType('Continue')}
        >
          Continue
        </Button>
      </Card>
    </Box>
  )
}
