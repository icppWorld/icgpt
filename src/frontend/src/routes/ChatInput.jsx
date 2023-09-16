// eslint-disable-next-line no-use-before-define
import React from 'react'
import 'dracula-ui/styles/dracula-ui.css'
import { Box, Button, Card, Heading, Divider, Text } from 'dracula-ui'
import { doSubmit } from '../canisters/llama2'



const II_URL = process.env.II_URL
const IC_HOST_URL = process.env.IC_HOST_URL

export function ChatInput({
  authClient,
  setAuthClient,
  actor,
  setActor,
  chatNew,
  setChatNew,
  inputPlaceholder,
  prompt,
  setPrompt,
}) {
  // ------------------------------------------------------------------------
  // Once user clicks the submit button:
  // TODO: call canister chat_new once user clicks submit prompt button
  // (-) store the function in a separate file: canisterLLM.js
  // (-) import the function
  // (-) pass the function into ChatInput component
  // (-) execute the function
  //
  // Upon success, navigate to the ChatNow page

  // -------------------------------------------------------------------------
  // UI work
  const [text, setText] = React.useState('')
  const textareaRef = React.useRef(null)

  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto' // reset the height
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [text])

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
  }

  return (
    <Card
      id="chatInput"
      variant="subtle"
      color="white"
      p="sm"
      m="sm"
      style={floatingStyle}
    >
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
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

      <Button onClick={() => doSubmit({
        authClient,
        actor,
        chatNew,
        setActor,
        setChatNew,
        setPrompt,
        text
      })}>
        <i
          className="bi bi-caret-right-square-fill"
          style={{ fontSize: '20px' }}
        ></i>
      </Button>
    </Card>
  )
}
