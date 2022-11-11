import { PushpinUrl } from "./pushpin-code/ShareLink"
import React, { ReactElement, useMemo } from "react"
import * as ContentTypes from "./pushpin-code/ContentTypes"
import { Popover } from "./ui/Popover"
import ListMenuSection from "./ui/ListMenuSection"
import ListMenuItem from "./ui/ListMenuItem"
import classNames from "classnames"

interface NewDocumentButtonProps {
  trigger: ReactElement
  onCreateDocument: (pushpinUrl: PushpinUrl) => void
}

export default function NewDocumentButton({
  trigger,
  onCreateDocument,
}: NewDocumentButtonProps) {
  const contentTypes = useMemo(
    () => ContentTypes.list({ context: "board" }),
    []
  )

  const createDoc = (contentType: ContentTypes.LookupResult) => {
    ContentTypes.create(contentType.type, {}, (contentUrl) => {
      onCreateDocument(contentUrl)
    })
  }

  return (
    <Popover closeOnClick={true} trigger={trigger}>
      <ListMenuSection>
        {contentTypes.map((contentType) => (
          <ListMenuItem
            onClick={() => {
              console.log("NEW", "click item", contentType.type)
              createDoc(contentType)
            }}
            key={contentType.type}
          >
            <div className="ContextMenu__iconBounding ContextMenu__iconBounding--note">
              <i className={classNames("fa", `fa-${contentType.icon}`)} />
            </div>
            <span className="ContextMenu__label">{contentType.name}</span>
          </ListMenuItem>
        ))}
      </ListMenuSection>
    </Popover>
  )
}
