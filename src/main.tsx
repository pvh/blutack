import React from 'react'
import ReactDOM from 'react-dom/client'
import Root from './components/Root'
import './app.css'
import './ibm-plex.css'
import './vendor/line-awesome/css/line-awesome.min.css'

import localforage from "localforage"

import { Repo } from "automerge-repo"
import { LocalForageStorageAdapter } from "automerge-repo-storage-localforage"
import { BroadcastChannelNetworkAdapter } from "automerge-repo-network-broadcastchannel"
import { DocumentId, RepoContext } from 'automerge-repo-react-hooks'
import * as ContentTypes from './components/pushpin-code/ContentTypes'
import { create as createWorkspace } from './components/content-types/workspace/Workspace'

const repo = await Repo({
    storage: new LocalForageStorageAdapter(),
    network: [
      new BroadcastChannelNetworkAdapter(),
    ],
})

ContentTypes.setRepo(repo)

const findOrMakeDoc = async (key: string): Promise<DocumentId> => {
  let docId = new URLSearchParams(window.location.search).get(key);

  if (!docId) { docId = await localforage.getItem(key) }
  if (!docId) { 
    console.log('initializing document', key)
    const workspaceHandle = repo.create()
    docId = workspaceHandle.documentId
    if (key == "workspaceDocId") {
      console.log('workspacing')
      createWorkspace({}, workspaceHandle)
      console.log(`?workspaceDocId=${docId}`)
    }
    await localforage.setItem(key, docId)
  }  
  return docId as DocumentId
}

// bootstrapping: first try the window location, then check indexedDB, then make one
const workspaceDocId = await findOrMakeDoc("workspaceDocId")
const deviceDocId = await findOrMakeDoc("deviceDocId")

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <RepoContext.Provider value={repo}>
      <Root workspaceDocId={workspaceDocId} deviceDocId={deviceDocId}/>
    </RepoContext.Provider>
  </React.StrictMode>
)
