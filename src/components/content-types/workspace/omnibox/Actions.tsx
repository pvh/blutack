import React from 'react'
import Action from './Action'

export interface ActionItem {
  name: string
  label: string
  faIcon: string
  shortcut?: string
  destructive?: boolean
  callback(url: string): () => void
}

interface Props {
  url: string
  actions: ActionItem[]
  children?: React.ReactNode
}

export default function Actions(props: Props) {
  function onActionClick(e: React.MouseEvent, callback: () => void) {
    e.stopPropagation()
    callback()
  }

  return (
    <div className="Actions">
      {props.children}

      {props.actions.map((action) => (
        <Action
          key={action.name}
          callback={(e) => onActionClick(e, action.callback(props.url))}
          faIcon={action.faIcon}
          label={action.label}
          shortcut={action.shortcut}
          destructive={action.destructive}
        />
      ))}
    </div>
  )
}
