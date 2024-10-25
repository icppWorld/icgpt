// ChatsPopupModal.jsx

import React from 'react'
import 'dracula-ui/styles/dracula-ui.css'
import { Box, Button, Card, Heading, Divider, Text } from 'dracula-ui'
import { doNewChatLlamacpp } from '../canisters/llamacpp.js'

const DEBUG = true

export function ChatsPopupModal({ onClose }) {
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
      <Card
        style={{
          padding: '20px',
          backgroundColor: '#282a36',
          borderRadius: '8px',
          color: '#f8f8f2',
          maxWidth: '300px',
          textAlign: 'center',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Heading size="lg" color="purple">
          Select Option
        </Heading>
        <Text color="white" mb="sm">
          Choose an action:
        </Text>
        <Button
          color="purple"
          size="sm"
          m="xs"
          onClick={() => {
            console.log('Button 1 clicked')
            onClose()
          }}
        >
          Button 1
        </Button>
        <Button
          color="yellow"
          size="sm"
          m="xs"
          onClick={() => {
            console.log('Button 2 clicked')
            onClose()
          }}
        >
          Button 2
        </Button>
        <Button
          color="green"
          size="sm"
          m="xs"
          onClick={() => {
            console.log('Button 3 clicked')
            onClose()
          }}
        >
          Button 3
        </Button>
        <Divider color="purple" m="sm" />
        <Button color="red" size="sm" onClick={onClose}>
          Cancel
        </Button>
      </Card>
    </div>
  )
}
