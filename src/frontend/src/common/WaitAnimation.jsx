import 'dracula-ui/styles/dracula-ui.css'
import { Box, Card, Text, Divider } from 'dracula-ui'
import { ImageWithFallback } from '../common/ImageWithFallback'
import { floatingStyleTop } from '../common/styles'

export function WaitAnimation({ message }) {
  return (
    <Card
      variant="subtle"
      color="black-transparent"
      p="none"
      m="none"
      style={{
        ...floatingStyleTop,
        zIndex: 1002,
      }}
    >
      <ImageWithFallback
        src="loader.webp"
        fallback="loader.gif"
        alt="DFINITY Astronaut Logo"
      />

      <Divider></Divider>

      <Box color="black">
        <Text color="yellow">{message}</Text>
      </Box>
    </Card>
  )
}
