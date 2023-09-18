// eslint-disable-next-line no-use-before-define
import React from 'react'
import 'dracula-ui/styles/dracula-ui.css'
import { Box, Button, Card, Heading, Divider, Paragraph, Text } from 'dracula-ui'
import { floatingStyleTop } from '../common/styles'

const II_URL = process.env.II_URL
const IC_HOST_URL = process.env.IC_HOST_URL

export function ChatOutput({ chatOutputText }) {
  return (
    <div>
      <Box
        scrollbar={true}
        height="sm"
        style={floatingStyleTop}
      >
        <Paragraph>
          {chatOutputText}
        </Paragraph>
      </Box>
    </div>
  )
}
