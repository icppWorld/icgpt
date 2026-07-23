// eslint-disable-next-line no-use-before-define
import React from 'react'
import 'dracula-ui/styles/dracula-ui.css'
import { Box } from 'dracula-ui'
import { floatingStyleTop } from '../common/styles'
import { ChatMessage } from '../common/ChatMessage'
import { WorkingIndicator } from '../common/WorkingIndicator'

// The conversation view: completed turns (messages) as bubbles, followed by the
// in-progress assistant reply (chatOutputText) streaming into its own bubble,
// and - while the canister is working - a subtle status line right under it.
//
// TinyStories (frozen llama2.js) leaves messages empty and only streams into
// chatOutputText, so it shows a single assistant bubble - unchanged behavior.
export function ChatOutput({
  chatOutputText,
  messages,
  isWorking,
  workingMessage,
  heightChatInput,
}) {
  const bottomRef = React.useRef(null)
  const list = messages || []

  // Keep the latest content in view as it streams in.
  React.useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [list.length, chatOutputText, isWorking])

  const containerStyle = {
    ...floatingStyleTop,
    maxHeight: `calc(100vh - ${heightChatInput}px - 90px)`,
    overflowY: 'auto',
    textAlign: 'left',
  }

  return (
    <div>
      <Box scrollbar={true} style={containerStyle}>
        {list.map((m, i) => (
          <ChatMessage key={i} role={m.role} content={m.content} />
        ))}
        {chatOutputText ? (
          <ChatMessage role="assistant" content={chatOutputText} />
        ) : null}
        {isWorking ? <WorkingIndicator message={workingMessage} /> : null}
        <div ref={bottomRef} />
      </Box>
    </div>
  )
}
