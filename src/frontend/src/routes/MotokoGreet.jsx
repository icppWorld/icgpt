// eslint-disable-next-line no-use-before-define
import React from 'react'
import { canister_motoko } from 'DeclarationsCanisterMotoko'
import 'dracula-ui/styles/dracula-ui.css'
import { Box, Card, Input, Button, Divider, Text } from 'dracula-ui'

export function MotokoGreet() {
  const [name, setName] = React.useState('')
  const [message, setMessage] = React.useState('')

  async function doGreet() {
    const greeting = await canister_motoko.greet(name)
    setMessage(greeting)
  }

  return (
    <Box>
      <Input
        id="name"
        color="yellow"
        variant="outline"
        borderSize="sm"
        placeholder="Enter your name and click Submit..."
        value={name}
        onChange={(event) => setName(event.target.value)}
      ></Input>
      <Button color="yellow" onClick={doGreet}>
        Submit
      </Button>
      <Box>
        <Divider color="purple"></Divider>
      </Box>
      <Card color="pinkPurple" p="sm">
        <Text color="black">{message}</Text>
      </Card>
    </Box>
  )
}
