import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

import localforage from "localforage"

import { Repo } from "automerge-repo"
import { LocalForageStorageAdapter } from "automerge-repo-storage-localforage"
import { BroadcastChannelNetworkAdapter } from "automerge-repo-network-broadcastchannel"
import { DocumentId, RepoContext } from 'automerge-repo-react-hooks'

const repo = await Repo({
    storage: new LocalForageStorageAdapter(),
    network: [
      new BroadcastChannelNetworkAdapter(),
    ],
})

// bootstrapping: first try the window location, then check indexedDB, then make one
let rootDocId: string | null = window.location.hash.replace(/^#/, "")
if (!rootDocId) { rootDocId = await localforage.getItem("rootDocId") }
if (!rootDocId) { 
  console.log('initializing the document')
  const rootHandle = repo.create()
  rootDocId = rootHandle.documentId
  await localforage.setItem("rootDocId", rootDocId)
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <RepoContext.Provider value={repo}>
      <App documentId={rootDocId as DocumentId}/>
    </RepoContext.Provider>
  </React.StrictMode>
)
