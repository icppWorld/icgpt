// eslint-disable-next-line no-use-before-define
import React, { useRef, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import 'dracula-ui/styles/dracula-ui.css'
import { Button, Box, Card, Text } from 'dracula-ui'
import { Divider } from 'dracula-ui/index'

function NavbarGlow() {
  // Put a glow underneath the navbar to provide a subtle divider effect
  return (
    <Card className="fixed-top">
      <Text color="black">dummy and invisible</Text>
    </Card>
  )
}

function Nav({ authClient, setAuthClient }) {
  /* Notes: 
    (-) We do NOT use "navbar-expand-.." to expand/collapse toggler
    (-) 'fixed-top' means the <nav ></nav> content is not considered during
        positioning of the rest. */
  return (
    <nav className="navbar fixed-top navbar-dark drac-bg-black">
      <Box className="container-fluid justify-content-start">
        <Toggler />
        <StaticNavLinks />
      </Box>

      <TogglerNavLinks authClient={authClient} setAuthClient={setAuthClient} />
    </nav>
  )
}

function Toggler() {
  /* Bootstrap Responsive Behavior: The hamburger icon for small screens */

  const togglerButtonRef = useRef()

  // Close an open toggler when user clicks anywhere
  useEffect(() => {
    const handleClick = () => {
      if (togglerButtonRef.current) {
        if (
          togglerButtonRef.current.className.includes('collapsed') === false
        ) {
          togglerButtonRef.current.click()
        }
      }
    }
    window.addEventListener('click', handleClick)
    return () => {
      window.removeEventListener('click', handleClick)
    }
  })

  return (
    <Button
      className="navbar-toggler"
      type="button"
      data-bs-toggle="collapse"
      data-bs-target="#navbarSupportedContent"
      ref={togglerButtonRef}
    >
      <span className="navbar-toggler-icon"></span>
    </Button>
  )
}

function TogglerNavLinks({ authClient, setAuthClient }) {
  const handleLogout = (e) => {
    e.preventDefault()

    // Logut from Internet Identity
    if (authClient) {
      authClient.logout()
    }
    console.log('Internet Identity Logout successful')

    // Reset the react state variables managing login
    setAuthClient(null)
  }
  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <Box
            mt="sm"
            className="collapse navbar-collapse"
            id="navbarSupportedContent"
            rounded="lg"
            color="blackSecondary"
            display="inline-block"
          >
            <Box>
              <NavLink
                to="/"
                className={(linkState) => {
                  if (linkState.isActive) {
                    return 'drac-anchor drac-box drac-bg-purple drac-text-black drac-text-black--hover drac-d-inline-block drac-rounded-lg drac-mr-sm drac-px-sm'
                  } else {
                    return 'drac-anchor drac-text drac-text-orange drac-text-pink--hover drac-mr-sm drac-px-sm'
                  }
                }}
              >
                home
              </NavLink>
            </Box>

            {/* 
            <Box>
              <NavLink
                to="/docs"
                className={(linkState) => {
                  if (linkState.isActive) {
                    return 'drac-anchor drac-box drac-bg-purple drac-text-black drac-text-black--hover drac-d-inline-block drac-rounded-lg drac-mr-sm drac-px-sm'
                  } else {
                    return 'drac-anchor drac-text drac-text-orange drac-text-pink--hover drac-mr-sm drac-px-sm'
                  }
                }}
              >
                Docs
              </NavLink>
            </Box>

            <Box>
              <Box color="yellow">
                <Divider />
              </Box>
            </Box>

            <Box>
              <NavLink
                to="/settings"
                className={(linkState) => {
                  if (linkState.isActive) {
                    return 'drac-anchor drac-box drac-bg-purple drac-text-black drac-text-black--hover drac-d-inline-block drac-rounded-lg drac-mr-sm drac-px-sm'
                  } else {
                    return 'drac-anchor drac-text drac-text-orange drac-text-pink--hover drac-mr-sm drac-px-sm'
                  }
                }}
              >
                Settings
              </NavLink>
            </Box>

            <Box>
              <Box color="yellow">
                <Divider />
              </Box>
            </Box> */}

            <Box>
              <NavLink
                to="/about"
                className={(linkState) => {
                  if (linkState.isActive) {
                    return 'drac-anchor drac-box drac-bg-purple drac-text-black drac-text-black--hover drac-d-inline-block drac-rounded-lg drac-mr-sm drac-px-sm'
                  } else {
                    return 'drac-anchor drac-text drac-text-orange drac-text-pink--hover drac-mr-sm drac-px-sm'
                  }
                }}
              >
                About icgpt
              </NavLink>
            </Box>

            <Box>
              <NavLink
                to="/loggedout"
                className={(linkState) => {
                  if (linkState.isActive) {
                    return 'drac-anchor drac-box drac-bg-purple drac-text-black drac-text-black--hover drac-d-inline-block drac-rounded-lg drac-mr-sm drac-px-sm'
                  } else {
                    return 'drac-anchor drac-text drac-text-orange drac-text-pink--hover drac-mr-sm drac-px-sm'
                  }
                }}
                onClick={handleLogout}
              >
                Logout
              </NavLink>
            </Box>
          </Box>
        </div>
      </div>
    </div>
  )
}

function StaticNavLinks() {
  // NavLinks that do not collapse under toggler
  return (
    <Box>
      <NavLink
        to="/"
        className={(linkState) => {
          if (linkState.isActive) {
            return 'drac-anchor drac-box drac-bg-purple-cyan drac-text-black drac-text-black--hover drac-d-inline-block drac-rounded-lg drac-mx-sm drac-px-sm'
          } else {
            return 'drac-anchor drac-text drac-text-purple drac-text-pink--hover drac-mr-sm drac-px-sm'
          }
        }}
      >
        icgpt
      </NavLink>
    </Box>
  )
}

export function Navbar({ authClient, setAuthClient }) {
  return (
    <header>
      <NavbarGlow />
      <Nav authClient={authClient} setAuthClient={setAuthClient} />
    </header>
  )
}
