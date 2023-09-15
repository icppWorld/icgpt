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
              ICGPT Labs (COMING SOON!)
            </Heading>
            <Heading color="yellow" size="sm">
              on-chain LLMs
            </Heading>
            <Divider></Divider>
            <LogInWithInternetIdentity setAuthClient={setAuthClient} />

            <Divider></Divider>

            <Box>
              <Table>
                <tbody>
                  <tr>
                    <td className="drac-text-bold drac-text-white">data set</td>
                    <td className="drac-text-bold drac-text-white">
                      model size
                    </td>
                    <td className="drac-text-bold drac-text-white">
                      finetuned
                    </td>
                    <td className="drac-text-bold drac-text-white">status</td>
                  </tr>
                  <tr>
                    <td className="drac-text drac-text-cyan">TinyStories</td>
                    <td className="drac-text drac-text-cyan">15M</td>
                    <td className="drac-text drac-text-cyan">LLM</td>
                    <td className="drac-text drac-text-cyan">Deployed</td>
                  </tr>
                  <tr>
                    <td className="drac-text drac-text-orange">TinyStories</td>
                    <td className="drac-text drac-text-orange">260K</td>
                    <td className="drac-text drac-text-orange">LLM</td>
                    <td className="drac-text drac-text-orange">Coming soon</td>
                  </tr>
                  <tr>
                    <td className="drac-text drac-text-orange">TinyStories</td>
                    <td className="drac-text drac-text-orange">15M</td>
                    <td className="drac-text drac-text-orange">Chat</td>
                    <td className="drac-text drac-text-orange">Coming soon</td>
                  </tr>
                  <tr>
                    <td className="drac-text drac-text-red">TinyStories</td>
                    <td className="drac-text drac-text-red">42M, 110M</td>
                    <td className="drac-text drac-text-red">LLM, Chat</td>
                    <td className="drac-text drac-text-red">Research</td>
                  </tr>
                  <tr>
                    <td className="drac-text drac-text-red">Llama2</td>
                    <td className="drac-text drac-text-red">7B, 13B, 70B</td>
                    <td className="drac-text drac-text-red">LLM, Chat</td>
                    <td className="drac-text drac-text-red">Research</td>
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
