import { useState } from 'react'
import reactLogo from './assets/react.svg'
import './App.css'
import { DocumentId, useDocument } from 'automerge-repo-react-hooks'

type AppArgs = {
  documentId: DocumentId
}

type AppDoc = {
  count: number
}

function App({ documentId } : AppArgs) {
  const [doc, change] = useDocument<AppDoc>(documentId)
  console.log("doc", doc)
  if (!doc) { return <div>loading...</div>}
  if (doc.count === undefined) { 
    change(d => {
      d.count = 0
    })
  }

  return (
    <div className="App">
      <div>
        <a href="https://vitejs.dev" target="_blank">
          <img src="/vite.svg" className="logo" alt="Vite logo" />
        </a>
        <a href="https://reactjs.org" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => change((d) => d.count = d.count + 1)}>
          count is {doc.count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </div>
  )
}

export default App
