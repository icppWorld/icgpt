// eslint-disable-next-line no-use-before-define
import React from 'react'
import 'dracula-ui/styles/dracula-ui.css'
import { Box, Button, Card, Heading, Divider, Text } from 'dracula-ui'

export function ChatInput({ inputPlaceholder, prompt, setPrompt }) {
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

  function doSetPrompt() {
    setPrompt(text)
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

      <Button onClick={doSetPrompt}>
        <i
          className="bi bi-caret-right-square-fill"
          style={{ fontSize: '20px' }}
        ></i>
      </Button>
    </Card>
  )
}
