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
import ContentDragHandle from '../ui/ContentDragHandle'
import Badge from '../ui/Badge'
import TitleWithSubtitle from '../ui/TitleWithSubtitle'

export interface ContentListDoc {
  title: string
  content: PushpinUrl[]
}

export default function ContentList({documentId}: ContentProps) {
  const [doc, changeDoc] = useDocument<ContentListDoc>(documentId)
  const [currentContent, selectContent] = useState<PushpinUrl | undefined>()
  const [addingNewItem, setAddingNewItem] = useState(false)
  const contentTypes = useMemo(() => ContentTypes.list({ context: 'board' }), [])

  if (!doc || !doc.content) {
    return null
  }

  if (!currentContent && doc.content.length > 0) {
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
      <CenteredStackRowItem size={{mode: "fixed", width: "250px"}} style={{ borderRight: "solid thin #ddd"}}>
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
              <ListMenuItem onClick={() => setAddingNewItem(prev => !prev)}>
                + Create new item
              </ListMenuItem>
              {addingNewItem && (
              <ListMenuSection>
              { contentTypes.map((contentType) => (
                <ListMenuItem onClick={() => {
                  addContent(contentType);
                  setAddingNewItem(false)}
                } key={contentType.type}>
                  <div className="ContextMenu__iconBounding ContextMenu__iconBounding--note">
                    <i className={classNames('fa', `fa-${contentType.icon}`)} />
                  </div>
                  <span className="ContextMenu__label">{contentType.name}</span>
                </ListMenuItem>))
              }
              </ListMenuSection>)}

          </ListMenu>
      </CenteredStackRowItem>
      <CenteredStackRowItem size={{mode: "auto"}}>
      {
          (currentContent) ?
            <Content context="workspace" url={currentContent}/>
          :
            <div style={{padding: "10px"}}>Select something from the side</div>
        }
      </CenteredStackRowItem>
    </CenteredStack>
  )
}

const icon = "list"

export function ContentListInList(props: ContentProps) {
  const { documentId, url } = props
  const [doc] = useDocument<ContentListDoc>(documentId)
  if (!doc || !doc.content) return null

  const title = doc.title != null && doc.title !== '' ? doc.title : 'Untitled List'
  const items = doc.content.length
  const subtitle = `${items} item${items !== 1 ? 's' : ''}`
  const editable = true

  return (
    <ListItem>
      <ContentDragHandle url={url}>
        <Badge size="medium" icon={icon} />
      </ContentDragHandle>
      <TitleWithSubtitle
        titleEditorField="title"
        title={title}
        subtitle={subtitle}
        documentId={documentId}
        editable={editable}
      />
    </ListItem>
  )
}

function create(unusedAttrs: any, handle: DocHandle<any>) {
  handle.change((doc: ContentListDoc) => {
    doc.content = []
  })
}

ContentTypes.register({
  type: 'contentlist',
  name: 'List',
  icon: 'sticky-note',
  contexts: {
    root: ContentList,
    board: ContentList,
    workspace: ContentList,
    list: ContentListInList,
    'title-bar': ContentListInList,
  },
  create,
})
