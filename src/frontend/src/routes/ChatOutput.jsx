// eslint-disable-next-line no-use-before-define
import React from 'react'
import 'dracula-ui/styles/dracula-ui.css'
import { Box } from 'dracula-ui'
import { floatingStyleTop } from '../common/styles'
import { ChatMessage } from '../common/ChatMessage'
import { WorkingIndicator } from '../common/WorkingIndicator'
import { useIsMobile } from '../common/useIsMobile'

// The conversation view: completed turns (messages) as bubbles, followed by the
// in-progress assistant reply (chatOutputText) streaming into its own bubble,
// and - while the canister is working - a subtle status line right under it.
//
// An empty conversation renders an empty area (ready to type). The view sits
// below the ModelSelector bar pinned at the top of the chat page.
export function ChatOutput({
  chatOutputText,
  messages,
  isWorking,
  workingMessage,
  heightChatInput,
}) {
  const bottomRef = React.useRef(null)
  const list = messages || []
  const isMobile = useIsMobile()

  // Keep the latest content in view as it streams in.
  React.useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [list.length, chatOutputText, isWorking])

  // Sit below the TopNav (48px) + the ModelSelector toolbar (~40px, taller when it wraps on
  // mobile). The bottom reserve (86px) leaves room for the fixed ChatInput.
  const topPx = isMobile ? 128 : 92
  const containerStyle = {
    ...floatingStyleTop,
    top: `${topPx}px`,
    maxHeight: `calc(100vh - ${heightChatInput}px - ${topPx + 86}px)`,
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
