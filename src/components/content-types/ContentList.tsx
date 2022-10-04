import React, { useContext, useRef, Ref, ChangeEvent, useState } from 'react'

import {
  PushpinUrl,
} from '../pushpin-code/ShareLink'

import Content, { ContentProps } from '../Content'
import * as ContentTypes from '../pushpin-code/ContentTypes'

import { GithubPicker } from 'react-color'
import { DocHandle, DocumentId } from 'automerge-repo'
import { useDocument } from 'automerge-repo-react-hooks'
import Heading from '../ui/Heading'
import SecondaryText from '../ui/SecondaryText'

import Badge from '../ui/Badge'
import CenteredStack from '../ui/CenteredStack'
import ListMenuSection from '../ui/ListMenuSection'
import ListMenuItem from '../ui/ListMenuItem'
import TitleEditor from '../TitleEditor'
import ListItem from '../ui/ListItem'
import ListMenu from '../ui/ListMenu'
import './ContentList.css'
import DefaultInList from './defaults/DefaultInList'

export interface ContentListDoc {
  title: string
  content: PushpinUrl[]
}

export default function ContentList(props: ContentProps) {
  const [doc, changeDoc] = useDocument<ContentListDoc>(props.documentId)
  const [currentContent, changeContent] = useState<PushpinUrl | undefined>()

  if (!doc) {
    return null
  }

  if (!currentContent) {
    changeContent(doc.content[0])
  }

  const { content } = doc

  const createThread = () => {
    ContentTypes.create('thread', {}, (threadUrl) =>{
      changeDoc(doc => {
        doc.content.push(threadUrl)
      })      
    })
  }


  return (
    <CenteredStack direction='row'>
    <CenteredStack centerText={false}>
      <ListMenu>
        {content.map(c =>
          <ListMenuItem onClick={() => changeContent(c)}>
            <Content context="list" url={c}/>
          </ListMenuItem>
        )}
      </ListMenu>
      <button onClick={createThread}>Make a thread</button>
    </CenteredStack>
    { 
      (currentContent) ?
        <Content context="workspace" url={currentContent}/>
      : 
        <div>Select something from the side I guess????</div>
    }
    </CenteredStack>
  )
}

function create(unusedAttrs: any, handle: DocHandle<any>) {
  handle.change((doc: ContentListDoc) => {
    doc.content = []
  })
}

ContentTypes.register({
  type: 'contentlist',
  name: 'Content List',
  icon: 'sticky-note',
  contexts: {
    root: ContentList,
    board: ContentList,
    workspace: ContentList,
    list: DefaultInList,
    'title-bar': DefaultInList,
  },
  create,
})
