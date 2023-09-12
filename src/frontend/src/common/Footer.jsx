// eslint-disable-next-line no-use-before-define
import React from 'react'
import 'dracula-ui/styles/dracula-ui.css'

export function Footer(props) {
  return (
    <footer className="container-fluid">
      <i className="fa fa-copyright"></i>
      <p className="mt-5 mb-3 text-muted">
        © {new Date().getFullYear()} | icppWorld
      </p>
    </footer>
  )
}
