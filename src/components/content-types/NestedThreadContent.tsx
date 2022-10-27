import * as ContentTypes from "../pushpin-code/ContentTypes"
import Content, { ContentProps, EditableContentProps } from "../Content"
import { DocHandle, DocumentId } from "automerge-repo"
import { Change, useDocument } from "automerge-repo-react-hooks"
import {
  createDocumentLink,
  parseDocumentLink,
  PushpinUrl,
} from "../pushpin-code/ShareLink"
import ListItem from "../ui/ListItem"
import ContentDragHandle from "../ui/ContentDragHandle"
import Badge from "../ui/Badge"
import TitleWithSubtitle from "../ui/TitleWithSubtitle"
import { useEffect, useRef, useState } from "react"
import { useSelfId } from "../pushpin-code/SelfHooks"
import * as ImportData from "../pushpin-code/ImportData"

import "./NestedThreadContent.css"
import CenteredStack from "../ui/CenteredStack"
import CenteredStackRowItem from "../ui/CenteredStackRowItem"

const ICON = "ban"

type Doc = {
  title?: string
  authorId: DocumentId
  items: PushpinUrl[]
}

function NestedThreadContentItem({
  itemUrl,
  changeDoc,
  setSidebarDocUrl,
}: {
  itemUrl: PushpinUrl
  changeDoc: Change<Doc>
  setSidebarDocUrl: (url: PushpinUrl | null) => void
}) {
  const selfId = useSelfId()
  const hiddenFileInput = useRef<HTMLInputElement>(null)
  const parsed = parseDocumentLink(itemUrl)
  const isThread = parsed.type === "nested-thread"
  const [isCollapsed, setIsCollapsed] = useState(false)

  function insertItemSibling(
    currentItemUrl: PushpinUrl,
    contentUrlToInsert: PushpinUrl
  ) {
    changeDoc((doc) => {
      if (doc.items.length === 0) {
        doc.items.push(contentUrlToInsert)
        return
      }

      const matchingItemIndex = doc.items.findIndex(
        (itemUrl) => itemUrl === currentItemUrl
      )

      if (matchingItemIndex === doc.items.length) {
        doc.items.push(contentUrlToInsert)
        return
      }

      // insert after any threads started from this item
      let itemInSlot
      let slotIndex = matchingItemIndex

      do {
        slotIndex = slotIndex + 1
        itemInSlot =
          doc.items[slotIndex] && parseDocumentLink(doc.items[slotIndex])
      } while (
        itemInSlot?.type === "nested-thread" &&
        slotIndex < doc.items.length
      )

      doc.items.splice(slotIndex, 0, contentUrlToInsert)
    })
  }

  return (
    <div className="messageWrapper">
      <div className="messageContentWrapper">
        {isThread && (
          <div>
            <button
              className="secondaryButton"
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              {isCollapsed ? "▶" : "▼"}
            </button>
            {!isCollapsed && (
              <button
                className="secondaryButton"
                onClick={() => {
                  setSidebarDocUrl(itemUrl)
                }}
              >
                ➔
              </button>
            )}
          </div>
        )}

        <div
          className="messageContent"
          style={{ border: isThread ? "" : "thin solid rgb(221, 221, 221)" }}
        >
          {!isCollapsed && (
            <Content context="workspace" url={itemUrl} editable={true} />
          )}

          {!isThread && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "end",
                marginRight: "0.5em",
              }}
            >
              <div className="buttonsWrapper">
                <button
                  className="primaryButton"
                  onClick={() => {
                    ContentTypes.create("text", {}, (contentUrl) => {
                      insertItemSibling(itemUrl, contentUrl)
                    })
                  }}
                >
                  + Text
                </button>

                <button
                  className="primaryButton"
                  onClick={() => {
                    hiddenFileInput.current?.click()
                  }}
                >
                  + File
                </button>

                <button
                  className="primaryButton"
                  onClick={() => {
                    ContentTypes.create("nested-thread", {}, (threadUrl) => {
                      insertItemSibling(itemUrl, threadUrl)
                    })
                  }}
                >
                  ↳ Thread
                </button>
              </div>
              <div className="messageUser">
                <Content
                  context="thread"
                  url={createDocumentLink("contact", selfId)}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <input
        type="file"
        onChange={(e: any) => {
          ImportData.importFileList(e.target.files, (url) => {
            insertItemSibling(itemUrl, url)
          })
        }}
        ref={hiddenFileInput}
        style={{ display: "none" }}
      />
    </div>
  )
}

export default function NestedThreadContent(props: ContentProps) {
  const { documentId } = props
  const [doc, changeDoc] = useDocument<Doc>(documentId)
  const selfId = useSelfId()
  const [sidebarDocUrl, setSidebarDocUrl] = useState<PushpinUrl | null>(null)

  // set author to self -- a hack, but I can't figure out how to get selfId when create() is called
  useEffect(() => {
    if (doc && !doc.authorId) {
      changeDoc((doc) => {
        doc.authorId = selfId
      })
    }
  }, [doc])

  return (
    <CenteredStack direction="row" centerText={false}>
      <CenteredStackRowItem
        size={{ mode: "auto" }}
        style={{ borderRight: "solid thin #ddd" }}
      >
        {doc?.items.map((itemUrl) => {
          return (
            <NestedThreadContentItem
              itemUrl={itemUrl}
              changeDoc={changeDoc}
              setSidebarDocUrl={(newSidebarDocUrl) =>
                setSidebarDocUrl(
                  newSidebarDocUrl === sidebarDocUrl ? null : newSidebarDocUrl
                )
              }
            />
          )
        })}
      </CenteredStackRowItem>

      {sidebarDocUrl && (
        <CenteredStackRowItem size={{ mode: "auto" }}>
          <Content context="workspace" url={sidebarDocUrl} editable={true} />

          {/*
          <button
            style={{
              fontSize: "1.2em",
              padding: "0.5em",
              position: "absolute",
              top: "1em",
              right: "1em",
            }}
            className="primaryButton"
            onClick={() => setSidebarDocUrl(null)}
          >
            ×
          </button>
            */}
        </CenteredStackRowItem>
      )}
    </CenteredStack>
  )
}

export function NestedThreadInList(props: EditableContentProps) {
  const { documentId, url, editable } = props
  const [doc] = useDocument<Doc>(documentId)

  if (!doc) return null

  const title =
    doc.title && doc.title !== "" ? doc.title : "Untitled nested thread"

  return (
    <ListItem>
      <ContentDragHandle url={url}>
        <Badge size="medium" icon={ICON} />
      </ContentDragHandle>
      <TitleWithSubtitle
        titleEditorField="title"
        title={title}
        documentId={documentId}
        editable={editable}
      />
    </ListItem>
  )
}

function create(unusedAttrs: any, handle: DocHandle<any>) {
  ContentTypes.create("text", {}, (topLevelText) => {
    handle.change((doc: Doc) => {
      doc.title = ""
      doc.items = [topLevelText]
    })
  })
}

ContentTypes.register({
  type: "nested-thread",
  name: "Nested Thread",
  icon: ICON,
  contexts: {
    workspace: NestedThreadContent,
    board: NestedThreadContent,
    list: NestedThreadInList,
    "title-bar": NestedThreadInList,
  },
  create,
})
