// eslint-disable-next-line no-use-before-define
import React from 'react'
import 'dracula-ui/styles/dracula-ui.css'
import { Box, Button, Card, Heading, Divider, Text } from 'dracula-ui'

export function ChatSelectModelSizeCardLlama2({ modelSize, doSetModelSize }) {
    return (
        <Card
            id="setModelSizeCard_Llama2"
            variant="subtle"
            color="purple"
            p="md"
            m="md"
        >
            {/* <Box>
          <Text color="white">Model Size: </Text>
        </Box>

        <Divider></Divider> */}
            <Button
                color={modelSize === '7B' ? 'white' : 'purple'}
                size="lg"
                p="2xl"
                onClick={() => doSetModelSize('7B')}
            >
                7B
            </Button>
            <Button
                color={modelSize === '13B' ? 'white' : 'purple'}
                size="lg"
                p="2xl"
                onClick={() => doSetModelSize('13B')}
            >
                13B
            </Button>
            <Button
                color={modelSize === '70B' ? 'white' : 'purple'}
                size="lg"
                p="2xl"
                onClick={() => doSetModelSize('70B')}
            >
                70B
            </Button>
        </Card>
    )
}
