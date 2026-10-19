import 'dracula-ui/styles/dracula-ui.css'
import { Box, Card, Heading } from 'dracula-ui'

export function CardError({ message }) {
  return (
    <Card variant="subtle" color="red" p="md" m="md">
      <Box>
        <Heading color="black">{message}</Heading>
      </Box>
    </Card>
  )
}
