// eslint-disable-next-line no-use-before-define
import React from 'react'
import 'dracula-ui/styles/dracula-ui.css'
import { Box, Button, Card, Heading, Divider, Text } from 'dracula-ui'
import { doNewChat } from '../canisters/llama2'

export function ChatNewChat({
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
  chatOutputText,
  setChatOutputText,
  setChatDisplay,
}) {
  // -----------------------------------------------------------------
  // Adjust button position based on height of the chatInput Card
  const [buttonPosition, setButtonPosition] = React.useState('10px') // Initial position

  React.useEffect(() => {
    function updatePosition() {
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
    left: '22px', // Adjust this for positioning from the left edge
    bottom: buttonPosition, // height_of_chatInput, and some_spacing as necessary
    zIndex: 1001, // Making sure this is above other elements
  }

  return (
    <Box
      id="chatNewChat"
      // variant="subtle"
      // color="white"
      p="sm"
      m="sm"
    >
      <Button
        color="white"
        size="sm"
        disabled={isSubmitting} // Always wait until current submit is done
        onClick={() =>
          doNewChat({
            authClient,
            actorRef,
            chatNew,
            chatDone,
            setActorRef,
            setChatNew,
            setChatDone,
            inputString,
            setInputString,
            inputPlaceholder,
            setInputPlaceholder,
            isSubmitting,
            setIsSubmitting,
            setChatOutputText,
            setChatDisplay,
          })
        }
        style={buttonStyle}
      >
        New chat
      </Button>
    </Box>
  )
}
