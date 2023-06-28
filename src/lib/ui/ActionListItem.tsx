import React, { ReactNode } from "react"
import Actions, { ActionItem } from "./Actions"
import { ContentUrl } from "../blutack/content/Url"
import ListMenuItem, { Stretch } from "./ListMenuItem"

export interface Props {
  contentUrl: ContentUrl
  defaultAction?: ActionItem
  actions: ActionItem[]
  selected: boolean
  children: ReactNode
}

ActionListItem.defaultProps = {
  actions: [],
  selected: false,
}

// TODO: item highlighting
export default function ActionListItem(props: Props) {
  const { children, contentUrl, actions, selected, defaultAction } = props
  const onClick = defaultAction ? defaultAction.callback(contentUrl) : undefined
  return (
    <ListMenuItem selected={selected} onClick={onClick}>
      <Stretch>{children}</Stretch>
      <Actions url={contentUrl} actions={actions} />
    </ListMenuItem>
  )
}
