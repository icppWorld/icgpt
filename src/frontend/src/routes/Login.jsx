// eslint-disable-next-line no-use-before-define
import React from 'react'
import { Helmet } from 'react-helmet'
import 'dracula-ui/styles/dracula-ui.css'
import { Box, Card, Heading, Divider, Table } from 'dracula-ui'

import { Footer } from '../common/Footer'
import { LogInWithInternetIdentity } from './LoginWithInternetIdentity'

export function Login({ setAuthClient }) {
  return (
    <div>
      <Helmet>
        <title>ICGPT: Login</title>
      </Helmet>
      <main>
        <div className="container-fluid text-center">
          <Card
            variant="subtle"
            color="none"
            my="sm"
            p="sm"
            display="inline-block"
          >
            <Heading color="white" size="xl">
              ICGPT Labs
            </Heading>
            <Heading color="yellow" size="sm">
              on-chain LLMs
            </Heading>
            <Divider></Divider>
            <LogInWithInternetIdentity setAuthClient={setAuthClient} />

            <Divider></Divider>

            <Heading color="cyan" size="sm">
              Currently deployed to IC canisters:
            </Heading>

            <Divider></Divider>

            <Box>
              <Table>
                <thead>
                  <tr>
                    <th className="drac-text drac-text-white">data set</th>
                    <th className="drac-text drac-text-white">model size</th>
                    <th className="drac-text drac-text-white">finetuned</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="drac-text drac-text-white">TinyStories</td>
                    <td className="drac-text drac-text-white">260K</td>
                    <td className="drac-text drac-text-white">LLM</td>
                  </tr>
                  <tr>
                    <td className="drac-text drac-text-white">TinyStories</td>
                    <td className="drac-text drac-text-white">15M</td>
                    <td className="drac-text drac-text-white">LLM</td>
                  </tr>
                </tbody>
              </Table>
            </Box>

            <Divider></Divider>

            <Heading color="yellow" size="sm">
              Coming soon:
            </Heading>

            <Divider></Divider>

            <Box>
              <Table>
                <thead>
                  <tr>
                    <th className="drac-text drac-text-white">data set</th>
                    <th className="drac-text drac-text-white">model size</th>
                    <th className="drac-text drac-text-white">finetuned</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="drac-text drac-text-white">TinyStories</td>
                    <td className="drac-text drac-text-white">15M</td>
                    <td className="drac-text drac-text-white">Chat</td>
                  </tr>
                  <tr>
                    <td className="drac-text drac-text-white">Llama2</td>
                    <td className="drac-text drac-text-white">7B</td>
                    <td className="drac-text drac-text-white">LLM</td>
                  </tr>
                  <tr>
                    <td className="drac-text drac-text-white">Llama2</td>
                    <td className="drac-text drac-text-white">7B</td>
                    <td className="drac-text drac-text-white">Chat</td>
                  </tr>
                </tbody>
              </Table>
            </Box>

          </Card>
        </div>
        <Footer />
      </main>
    </div>
  )
}
