// eslint-disable-next-line no-use-before-define
import React from 'react'
import { Helmet } from 'react-helmet'
import 'dracula-ui/styles/dracula-ui.css'
import { Card, Text } from 'dracula-ui'
import commitData from '../../assets/deploy-info/commit.json'

export function About() {
  return (
    <div>
      <Helmet>
        <title>ICGPT: About</title>
      </Helmet>
      <main>
        <div className="container-fluid">
          <Card color="blackSecondary" my="lg" p="lg" display="inline-block">
            <Text color="white" size="sm">
              Version: {commitData.sha}
            </Text>
          </Card>
        </div>
      </main>
    </div>
  )
}
