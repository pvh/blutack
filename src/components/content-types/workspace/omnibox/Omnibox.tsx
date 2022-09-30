/* eslint-disable react/sort-comp */
// this component has a bunch of weird pseudo-members that make eslint sad

import React, { useRef, useState, useCallback, useEffect } from 'react'
import Debug from 'debug'
import classNames from 'classnames'

import { createDocumentLink, parseDocumentLink, PushpinUrl } from '../../../pushpin-code/ShareLink'
import OmniboxWorkspace from './OmniboxWorkspace'
import './Omnibox.css'
import { useEvent } from '../../../pushpin-code/Hooks'
import ListMenuSection from '../../../ui/ListMenuSection'
import { DocumentId } from 'automerge-repo-react-hooks'

const log = Debug('pushpin:omnibox')

export interface Props {
  active: boolean
  documentId: DocumentId
  omniboxFinished: Function
  onContent: (url: PushpinUrl) => boolean
}

export default function Omnibox(props: Props) {
  const { active, documentId, omniboxFinished, onContent } = props
  const omniboxInput = useRef<HTMLInputElement>(null)
  const [search, setSearch] = useState('')

  const onInputChange = useCallback((e: any /* FIXME */ ) => {
    setSearch(e.target.value)
  }, [])

  const omniboxRef = useRef<HTMLDivElement>(null)
  useEvent(window, 'click', (event) => {
    if (!omniboxRef.current) {
      return
    }
    if (
      active &&
      event.target !== omniboxRef.current &&
      !omniboxRef.current.contains(event.target)
    ) {
      omniboxFinished()
    }
  })

  useEffect(() => {
    if (active && omniboxInput.current) {
      setSearch('')
      omniboxInput.current.value = ''
      omniboxInput.current.select()
    }
  }, [active])

  const stopPropagation = useCallback((e: React.SyntheticEvent) => {
    e.stopPropagation()
    e.nativeEvent.stopImmediatePropagation()
  }, [])

  log('render')

  // TODO: we had support for multiple workspace URLs in the omnibox
  // but i haven't wired that up and maybe we don't want to have it really
  const workspaceUrls = [ createDocumentLink("workspace", documentId) ]

  return (
    <div
      className={classNames(`Omnibox`, active ? 'Omnibox--active' : 'Omnibox--inactive')}
      ref={omniboxRef}
      onPaste={stopPropagation}
    >
      <div className="Omnibox-header">
        <input
          className="Omnibox-input"
          type="text"
          ref={omniboxInput}
          onChange={onInputChange}
          value={search}
          placeholder="Search..."
        />
      </div>
      <div className="Omnibox-Workspaces">
        {workspaceUrls.slice(0, 1).map((url, i) => {
          const { documentId } = parseDocumentLink(url)
          return (
            <OmniboxWorkspace
              key={url}
              viewContents
              onContent={onContent}
              omniboxFinished={omniboxFinished}
              documentId={documentId}
              search={search}
              active={active}
            />
          )
        })}
        {workspaceUrls.length > 1 ? (
          <ListMenuSection title="Other Accounts">
            {workspaceUrls.slice(1).map((url, i) => {
              const { documentId } = parseDocumentLink(url)
              return (
                <OmniboxWorkspace
                  key={url}
                  viewContents={false}
                  onContent={onContent}
                  omniboxFinished={omniboxFinished}
                  documentId={documentId}
                  search={search}
                  active={active}
                />
              )
            })}
          </ListMenuSection>
        ) : null}
      </div>
    </div>
  )
}
