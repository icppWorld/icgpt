// eslint-disable-next-line no-use-before-define
import React from 'react'
import ReactDOM from 'react-dom'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { App } from './App'
import { Chat } from './routes/Chat'
import { Home } from './routes/Home'
import { Motoko } from './routes/Motoko'
import { Docs } from './routes/Docs'
import { About } from './routes/About'
import { NothingHere } from './common/NothingHere'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'

ReactDOM.render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />}>
          <Route index element={<Chat />} />
          {/* <Route index element={<Home />} /> */}
          <Route path="motoko" element={<Motoko />} />
          <Route path="docs" element={<Docs />} />
          <Route path="about" element={<About />} />
          <Route path="*" element={<NothingHere />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
  document.getElementById('root')
)
