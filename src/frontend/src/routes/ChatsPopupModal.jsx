// ChatsPopupModal.jsx

import React from 'react'
import 'dracula-ui/styles/dracula-ui.css'
import { Box, Button, Card, Heading, Divider, Text } from 'dracula-ui'
import { doNewChatLlamacpp } from '../canisters/llamacpp.js'

const DEBUG = true

export function ChatsPopupModal({
  authClient,
  setAuthClient,
  actorRef,
  setActorRef,
  chatNew,
  setChatNew,
  chatDone,
  setChatDone,
  widthChatInput,
  setWidthChatInput,
  heightChatInput,
  setHeightChatInput,
  inputString,
  setInputString,
  inputPlaceholder,
  setInputPlaceholder,
  isSubmitting,
  setIsSubmitting,
  setChatOutputText,
  setChatDisplay,
  setWaitAnim,
  onClose,
}) {
  // -----------------------------------------------------------------
  // Adjust button position based on height of the chatInput Card
  const [modalPosition, setModalPosition] = React.useState('10px') // Initial position

  React.useEffect(() => {
    function updatePosition() {
      if (DEBUG) {
        console.log(
          'DEBUG-FLOW: entered ChatsPopupModal.jsx Chats.updatePosition '
        )
      }
      const calculatedBottomPosition = heightChatInput + 100
      setModalPosition(`${calculatedBottomPosition}px`)
    }

    // Initially set the position
    updatePosition()

    // Update position whenever window is resized
    window.addEventListener('resize', updatePosition)

    // Cleanup listener on component unmount
    return () => {
      window.removeEventListener('resize', updatePosition)
    }
  }, [heightChatInput])

  const floatingStyle = {
    position: 'fixed',
    bottom: modalPosition, // moves with height of ChatInput
    left: '10px', // if you want some spacing from the left
    right: '10px', // if you want some spacing from the right
    zIndex: 1000,
    boxShadow: '0px -2px 10px rgba(0, 0, 0, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexDirection: 'column',
    flexWrap: 'nowrap',
    paddingTop: '40px',
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1002,
      }}
      onClick={onClose}
    >
      <Card style={floatingStyle} onClick={(e) => e.stopPropagation()}>
        <Heading size="lg" color="black">
          Select a chat:
        </Heading>

        <Button
          color="white"
          size="sm"
          m="xs"
          style={{ width: '100%' }}
          onClick={() => {
            console.log('Button 1 clicked')
            setInputString('TODO: Button 1 input string..')
            setChatOutputText('TODO: Button 1 output string..')
            // force a re-render showing the ChatOutput
            setChatDisplay('ChatOutput')
            onClose()
          }}
        >
          Button 1
        </Button>
        <Button
          color="white"
          size="sm"
          m="xs"
          style={{ width: '100%' }}
          onClick={() => {
            console.log('Button 2 clicked')
            setInputString('TODO: Button 2 input string..')
            setChatOutputText('TODO: Button 2 output string..')
            // force a re-render showing the ChatOutput
            setChatDisplay('ChatOutput')
            onClose()
          }}
        >
          Button 2
        </Button>
        <Button
          color="white"
          size="sm"
          m="xs"
          style={{ width: '100%' }}
          onClick={() => {
            console.log('Button 3 clicked')
            setInputString('TODO: Button 3 input string..')
            setChatOutputText('TODO: Button 3 output string..')
            // force a re-render showing the ChatOutput
            setChatDisplay('ChatOutput')
            onClose()
          }}
        >
          Button 3
        </Button>
        <Divider color="white" m="sm" />
        <Button
          color="white"
          size="sm"
          style={{ alignSelf: 'center' }} // Centering the Cancel button
          onClick={() => {
            console.log('Button Cancel clicked')
            setChatNew(true)
            setChatDone(false)
            setInputString('')
            setChatOutputText('')
            setChatDisplay('SelectModel')
            onClose()
          }}
        >
          Cancel
        </Button>
      </Card>
    </div>
  )
}
