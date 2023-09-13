// eslint-disable-next-line no-use-before-define
import React from 'react'
import 'dracula-ui/styles/dracula-ui.css'
import { Box, Button, Card, Heading, Divider, Text } from 'dracula-ui'

export function ChatInput({ inputPlaceholder }) {
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
    bottom: '0',
    // left: '0',
    // right: '0',
    // backgroundColor: 'rgba(255, 255, 255, 0.8)',
    // padding: '10px',
    // boxShadow: '0px -2px 10px rgba(0, 0, 0, 0.1)',
    zIndex: 1000,
    overflow: 'hidden',
    resize: 'none',
    // width: '200px',
    // boxSizing: 'border-box',
    // marginLeft: 'auto', // Center the textarea if desired
    // marginRight: 'auto'
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
          overflow: 'hidden',
          resize: 'none',
          width: '400px', // Or whatever width you want
          boxSizing: 'border-box',
          borderRadius: '5px',
        }}
      />
    </Card>
  )
}
