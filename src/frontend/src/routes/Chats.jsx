// eslint-disable-next-line no-use-before-define
import React from 'react'
import 'dracula-ui/styles/dracula-ui.css'
import { Box, Button, Card, Heading, Divider, Text } from 'dracula-ui'
import { doNewChatLlamacpp } from '../canisters/llamacpp.js'
import { ChatsPopupModal } from './ChatsPopupModal'

const DEBUG = true

export function Chats({
  authClient,
  setAuthClient,
  actorRef,
  setActorRef,
  chatNew,
  setChatNew,
  chatDone,
  setChatDone,
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
  setWaitAnimationMessage,
  modelType,
}) {
  if (DEBUG) {
    console.log('DEBUG-FLOW: entered Chats.jsx Chats ')
  }
  // -----------------------------------------------------------------
  // Adjust button position based on height of the chatInput Card
  const [buttonPosition, setButtonPosition] = React.useState('10px') // Initial position

  // State for showing the modal containing the available Chats
  const [showChatsModal, setShowChatsModal] = React.useState(false)

  React.useEffect(() => {
    function updatePosition() {
      if (DEBUG) {
        console.log('DEBUG-FLOW: entered Chats.jsx Chats.updatePosition ')
      }
      const calculatedBottomPosition = heightChatInput + 30
      setButtonPosition(`${calculatedBottomPosition}px`)
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

  const buttonStyle = {
    position: 'fixed',
    left: '125px', // Adjust this for positioning from the left edge
    bottom: buttonPosition, // height_of_chatInput, and some_spacing as necessary
    zIndex: 1001, // Making sure this is above other elements
  }

  return (
    <Box
      id="Chats"
      // variant="subtle"
      // color="white"
      p="sm"
      m="sm"
    >
      {modelType !== 'TinyStories' && (
        <>
          <Button
            color="white"
            size="sm"
            disabled={isSubmitting || modelType === 'TinyStories'}
            onClick={() => setShowChatsModal(true)}
            style={buttonStyle}
          >
            Chats
          </Button>

          {/* Conditionally render PopupModal */}
          {showChatsModal && (
            <ChatsPopupModal onClose={() => setShowChatsModal(false)} />
          )}
        </>
      )}
    </Box>
  )
}
