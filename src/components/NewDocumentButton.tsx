import { PushpinUrl } from "./pushpin-code/Url"
import React, { ReactElement, useMemo, useRef } from "react"
import * as ContentTypes from "./pushpin-code/ContentTypes"
import { Popover } from "./ui/Popover"
import ListMenuSection from "./ui/ListMenuSection"
import ListMenuItem from "./ui/ListMenuItem"
import classNames from "classnames"
import * as ImportData from "./pushpin-code/ImportData"

interface NewDocumentButtonProps {
  trigger: ReactElement
  onCreateDocument: (pushpinUrl: PushpinUrl) => void
}

export default function NewDocumentButton({
  trigger,
  onCreateDocument,
}: NewDocumentButtonProps) {
  const hiddenFileInput = useRef<HTMLInputElement>(null)

  const contentTypes = useMemo(
    () => ContentTypes.list({ context: "board" }),
    []
  )

  const createDoc = (contentType: ContentTypes.LookupResult) => {
    ContentTypes.create(contentType.type, {}, (contentUrl) => {
      onCreateDocument(contentUrl)
    })
  }

  const onImportClick = () => {
    if (hiddenFileInput.current) {
      hiddenFileInput.current.click()
    }
  }
  const onFilesChanged = (e: any) => {
    ImportData.importFileList(e.target.files, (url) => {
      onCreateDocument(url)
    })
  }

  return (
    <Popover closeOnClick={true} trigger={trigger} placement={"bottom-start"}>
      <ListMenuSection>
        {contentTypes.map((contentType) => (
          <ListMenuItem
            onClick={() => {
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

        <ListMenuItem key="import" onClick={onImportClick}>
          <div>
            <input
              type="file"
              id="hiddender"
              multiple
              onChange={onFilesChanged}
              ref={hiddenFileInput}
              style={{ display: "none" }}
            />
            <div className="ContextMenu__iconBounding ContextMenu__iconBounding--note">
              <i className="fa fa-file-o" />
            </div>
          </div>
          <span className="ContextMenu__label">File</span>
        </ListMenuItem>
      </ListMenuSection>
    </Popover>
  )
}
