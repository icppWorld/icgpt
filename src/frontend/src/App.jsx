// eslint-disable-next-line no-use-before-define
import React from 'react'
import { Head } from './common/Head'
import { Footer } from './common/Footer'
import { Navbar } from './common/Navbar'
import { StagingBanner } from './common/StagingBanner'
import { Outlet } from 'react-router-dom'
import { Login } from './routes/Login'
import { WaitAnimation } from './routes/WaitAnimation'

export function App() {
  // Authentication with internet identity
  const [authClient, setAuthClient] = React.useState()

  if (!authClient) {
    return (
      <div>
        <Head />
        <Login setAuthClient={setAuthClient} />
      </div>
    )
  }

  return (
    <div>
      <Head />
      {/* <Navbar
        authClient={authClient}
        setAuthClient={setAuthClient}
      /> */}
      {/* https://stackoverflow.com/a/71882311/5480536 */}
      <Outlet context={[authClient, setAuthClient]} />
      {/* <StagingBanner /> */}
      <Footer />
    </div>
  )
}
