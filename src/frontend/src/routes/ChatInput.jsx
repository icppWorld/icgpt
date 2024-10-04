// eslint-disable-next-line no-use-before-define
import React from 'react'
import 'dracula-ui/styles/dracula-ui.css'
import { Box, Button, Card, Heading, Divider, Text } from 'dracula-ui'
import { doSubmit } from '../canisters/llama2'
import { doSubmitLlamacpp } from '../canisters/llamacpp.js'

const II_URL = process.env.II_URL
const IC_HOST_URL = process.env.IC_HOST_URL

export function ChatInput({
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
  modelType,
  modelSize,
  finetuneType,
}) {
  const textareaRef = React.useRef(null)

  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto' // reset the height
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
      // 2. Update the heightChatInput state variable, used to position other components
      setHeightChatInput(textareaRef.current.scrollHeight)
    }
  }, [inputString])

  const floatingStyle = {
    position: 'fixed',
    bottom: '10px', // or however much spacing you want from the bottom
    left: '10px', // if you want some spacing from the left
    right: '10px', // if you want some spacing from the right
    zIndex: 1000,
    boxShadow: '0px -2px 10px rgba(0, 0, 0, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    display: 'flex', // to make textarea and button sit side by side
    alignItems: 'center',
    gap: '10px',
    flexDirection: 'row',
    flexWrap: 'nowrap',
    paddingTop: '40px',
  }

  return (
    <Card
      id="chatInput"
      variant="subtle"
      color="white"
      p="xxs"
      m="xxs"
      style={floatingStyle}
    >
      <textarea
        ref={textareaRef}
        value={inputString}
        onChange={(e) => setInputString(e.target.value)}
        placeholder={inputPlaceholder}
        style={{
          flex: 1,
          overflow: 'hidden',
          resize: 'none',
          width: '100%',
          boxSizing: 'border-box',
          borderRadius: '5px',
        }}
      />

      <Button
        color="white"
        p="none"
        mr="none"
        disabled={isSubmitting} // Always wait until current submit is done
        onClick={() => {
          if (modelType === 'TinyStories') {
            doSubmit({
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
              isSubmitting,
              setIsSubmitting,
              modelType,
              modelSize,
              finetuneType,
            })
          } else if (modelType === 'Qwen2.5') {
            doSubmitLlamacpp({
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
              isSubmitting,
              setIsSubmitting,
              modelType,
              modelSize,
              finetuneType,
            })
          }
        }}
      >
        {/* https://icons.getbootstrap.com/ */}
        <i className="bi bi-caret-right"></i>
      </Button>
    </Card>
  )
}
