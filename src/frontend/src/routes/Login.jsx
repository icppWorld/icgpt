// eslint-disable-next-line no-use-before-define
import React from 'react'
import { Helmet } from 'react-helmet'
import 'dracula-ui/styles/dracula-ui.css'
import { Box, Card, Heading, Divider, Table } from 'dracula-ui'

import { Footer } from '../common/Footer'
import { InfoPopover } from '../common/InfoPopover'
import { LogInWithInternetIdentity } from './LoginWithInternetIdentity'

// Announcement of ICGPT on the DFINITY forum, September 17 2023
const FORUM_URL =
  'https://forum.dfinity.org/t/llama2-c-llm-running-in-a-canister/21991/16'

export function Login({ setAuthClient }) {
  return (
    <div>
      <Helmet>
        <title>ICGPT</title>
      </Helmet>
      <main>
        <div className="container-fluid text-center">
          <Card
            variant="subtle"
            color="none"
            my="sm"
            p="md"
            // mx="sm"
            display="inline-block"
          >
            <Heading color="yellow" size="md">
              ICGPT
            </Heading>
            <Heading color="yellow" size="sm">
              the OG of on-chain LLMs
              <InfoPopover ariaLabel="Why ICGPT is the OG of on-chain LLMs">
                ICGPT was released in <strong>September 2023</strong>, as the
                very first app to run LLM inference on-chain, and it has been
                serving on-chain LLMs ever since.
                <br />
                <br />
                <a
                  href={FORUM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#8be9fd' }}
                >
                  Read the original announcement on the DFINITY forum &rarr;
                </a>
              </InfoPopover>
            </Heading>

            <LogInWithInternetIdentity setAuthClient={setAuthClient} />
          </Card>
        </div>
        <Footer />
      </main>
    </div>
  )
}
