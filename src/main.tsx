import React from 'react'
import ReactDOM from 'react-dom/client'
import Root from './components/Root'
import './index.css'

import localforage from "localforage"

import { Repo } from "automerge-repo"
import { LocalForageStorageAdapter } from "automerge-repo-storage-localforage"
import { BroadcastChannelNetworkAdapter } from "automerge-repo-network-broadcastchannel"
import { DocumentId, RepoContext } from 'automerge-repo-react-hooks'

const repo = await Repo({
    // storage: new LocalForageStorageAdapter(), <-- fix this alex
    network: [
      new BroadcastChannelNetworkAdapter(),
    ],
})

const findOrMakeDoc = async (key: string): Promise<DocumentId> => {
  let docId = new URLSearchParams(window.location.search).get(key);
  
  if (!docId) { docId = await localforage.getItem(key) }
  if (!docId) { 
    console.log('initializing the document')
    const rootHandle = repo.create()
    docId = rootHandle.documentId
    await localforage.setItem(key, docId)
  }  
  return docId as DocumentId
}

// bootstrapping: first try the window location, then check indexedDB, then make one
const workspaceDocId = await findOrMakeDoc("workspaceDocId")
const selfDocId = await findOrMakeDoc("selfDocId")
const deviceDocId = await findOrMakeDoc("deviceDocId")

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <RepoContext.Provider value={repo}>
      <Root workspaceDocId={workspaceDocId} selfDocId={selfDocId} deviceDocId={deviceDocId}/>
    </RepoContext.Provider>
  </React.StrictMode>
)
