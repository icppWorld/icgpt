// eslint-disable-next-line no-use-before-define
import React from 'react'
import ReactDOM from 'react-dom'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { App } from './App'
import { Chat } from './routes/Chat'
import { PromptCostLab } from './lab/PromptCostLab'
import { CanistersPage } from './routes/CanistersPage'
import { NothingHere } from './common/NothingHere'
import { DocsLayout } from './routes/DocsLayout'
import { DocsHome } from './routes/DocsHome'
import { DocsPage } from './routes/DocsPage'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'

ReactDOM.render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* PUBLIC docs — a top-level route OUTSIDE <App>, so it bypasses the
            early-access gate and is readable by anybody (a marketing tool). */}
        <Route path="/docs" element={<DocsLayout />}>
          <Route index element={<DocsHome />} />
          <Route path=":slug" element={<DocsPage />} />
        </Route>
        <Route path="/" element={<App />}>
          {/* The Prompt Cost Lab is the default landing page for signed-in users; Chat is a
              separate destination at /chat. Both are gated under <App> (early-access). */}
          <Route index element={<PromptCostLab />} />
          <Route path="chat" element={<Chat />} />
          {/* /lab kept as an alias for the Lab so old links/bookmarks still resolve. */}
          <Route path="lab" element={<PromptCostLab />} />
          {/* Canisters & cycles status — nested under <App> for auth, but <App> lets ANY
              signed-in user view it (not just early-access; see App.jsx openWhenSignedIn). */}
          <Route path="canisters" element={<CanistersPage />} />
          <Route path="*" element={<NothingHere />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
  document.getElementById('root')
)
