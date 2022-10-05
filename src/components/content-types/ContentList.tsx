import React, { useContext, useRef, Ref, ChangeEvent, useState, useMemo } from 'react'

import {
  PushpinUrl,
} from '../pushpin-code/ShareLink'

import Content, { ContentProps } from '../Content'
import * as ContentTypes from '../pushpin-code/ContentTypes'

import { DocHandle, DocumentId } from 'automerge-repo'
import { useDocument } from 'automerge-repo-react-hooks'

import CenteredStack from '../ui/CenteredStack'
import ListMenuItem from '../ui/ListMenuItem'
import ListMenu from '../ui/ListMenu'
import './ContentList.css'
import DefaultInList from './defaults/DefaultInList'
import ListMenuHeader from '../ui/ListMenuHeader'
import TitleEditor from '../TitleEditor'
import ListItem from '../ui/ListItem'
import ListMenuSection from '../ui/ListMenuSection'
import classNames from 'classnames'
import ActionListItem from './workspace/omnibox/ActionListItem'
import CenteredStackRowItem from '../ui/CenteredStackRowItem'

export interface ContentListDoc {
  title: string
  content: PushpinUrl[]
}

export default function ContentList({documentId}: ContentProps) {
  const [doc, changeDoc] = useDocument<ContentListDoc>(documentId)
  const [currentContent, selectContent] = useState<PushpinUrl | undefined>()
  const contentTypes = useMemo(() => ContentTypes.list({ context: 'board' }), [])

  if (!doc) {
    return null
  }

  if (!currentContent) {
    selectContent(doc.content[0])
  }

  const { content } = doc

  const addContent = (contentType: ContentTypes.LookupResult) => {
    ContentTypes.create(contentType.type, {}, (contentUrl) =>{
      changeDoc(doc => {
        doc.content.push(contentUrl)
      })
    })
  }

  const removeContent = (url: PushpinUrl) => {
    changeDoc(doc => {
      const index = doc.content.findIndex(v => v === url)
      if (index > 0) {
        doc.content.splice(index, 1)
      }
    })
  }

  // XXX: Would be better to not recreate this every render.
  const actions = [
    {
      name: 'view',
      faIcon: 'fa-compass',
      label: 'View',
      shortcut: '⏎',
      keysForActionPressed: (e: KeyboardEvent) => !e.shiftKey && e.key === 'Enter',
      callback: (url: PushpinUrl) => () => selectContent(url),
    },
    {
      name: 'remove',
      destructive: true,
      callback: (url: PushpinUrl) => () => removeContent(url),
      faIcon: 'fa-trash',
      label: 'Remove',
      shortcut: '⌘+⌫',
      keysForActionPressed: (e: KeyboardEvent) => (e.metaKey || e.ctrlKey) && e.key === 'Backspace',
    },
  ]

  return (
    <CenteredStack direction='row' centerText={false}>
      <CenteredStackRowItem size={{mode: "fixed", width: "20%"}}>
          <ListMenu>
            {content.map(url =>
              <ActionListItem
                key={url}
                contentUrl={url}
                defaultAction={actions[0]}
                actions={actions}
                selected={url === currentContent}
              >
                <Content context="list" url={url} editable={false}/>
              </ActionListItem>
            )}
            <ListMenuSection>
              <ListMenuHeader>
                + Create new item
              </ListMenuHeader>
              { contentTypes.map((contentType) => (
                <ListMenuItem onClick={() => addContent(contentType)} key={contentType.type}>
                  <div className="ContextMenu__iconBounding ContextMenu__iconBounding--note">
                    <i className={classNames('fa', `fa-${contentType.icon}`)} />
                  </div>
                  <span className="ContextMenu__label">{contentType.name}</span>
                </ListMenuItem>))
              }
            </ListMenuSection>
          </ListMenu>
      </CenteredStackRowItem>
      <CenteredStackRowItem size={{mode: "auto"}}>
      {
          (currentContent) ?
            <Content context="workspace" url={currentContent}/>
          :
            <div>Select something from the side I guess????</div>
        }
      </CenteredStackRowItem>
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
