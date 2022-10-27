import * as ContentTypes from "../pushpin-code/ContentTypes"
import Content, { ContentProps, EditableContentProps } from "../Content"
import { DocHandle, DocumentId } from "automerge-repo"
import { useDocument, useRepo } from "automerge-repo-react-hooks"
import {
  createDocumentLink,
  parseDocumentLink,
  PushpinUrl,
} from "../pushpin-code/ShareLink"
import ListItem from "../ui/ListItem"
import ContentDragHandle from "../ui/ContentDragHandle"
import Badge from "../ui/Badge"
import TitleWithSubtitle from "../ui/TitleWithSubtitle"
import { useEffect, useRef } from "react"
import { useSelfId } from "../pushpin-code/SelfHooks"
import * as ImportData from "../pushpin-code/ImportData"

import "./NestedThreadContent.css"

const ICON = "ban"

type Doc = {
  title?: string
  authorId: DocumentId
  items: PushpinUrl[]
}

export default function NestedThreadContent(props: ContentProps) {
  const { documentId } = props
  const [doc, changeDoc] = useDocument<Doc>(documentId)
  const selfId = useSelfId()
  const hiddenFileInput = useRef<HTMLInputElement>(null)
  const repo = useRepo()

  // set author to self -- a hack, but I can't figure out how to get selfId when create() is called
  useEffect(() => {
    if (doc && !doc.authorId) {
      changeDoc((doc) => {
        doc.authorId = selfId
      })
    }
  }, [doc])

  console.log("PROPS", props, doc)

  return (
    <div>
      {doc?.items.map((itemUrl) => {
        const parsed = parseDocumentLink(itemUrl)
        const isThread = parsed.type === "nested-thread"

        return (
          <div
            className="messageWrapper"
            style={{ marginLeft: isThread ? "1em" : "" }}
          >
            <div className="messageContent">
              <Content context="workspace" url={itemUrl} editable={true} />

              {!isThread && (
                <div
                  style={{
                    display: "flex",
                    float: "right",
                    alignItems: "end",
                    marginRight: "0.5em",
                    marginBottom: "0.5em",
                  }}
                >
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
        )
      })}
      <div>
        <button
          onClick={() => {
            ContentTypes.create("text", {}, (contentUrl) => {
              changeDoc((doc) => {
                doc.items.push(contentUrl)
              })
            })
          }}
        >
          + Text
        </button>

        <button
          onClick={() => {
            hiddenFileInput.current?.click()
          }}
        >
          + File
        </button>

        <button
          onClick={() => {
            ContentTypes.create("nested-thread", {}, (threadUrl) => {
              changeDoc((doc) => {
                doc.items.push(threadUrl)
              })

              // start with text inside the thread
              const threadHandle = repo.find(
                parseDocumentLink(threadUrl).documentId
              )
              threadHandle.change((threadDoc) => {
                ContentTypes.create("text", {}, (textUrl) => {
                  ;(threadDoc as Doc).items.push(textUrl)
                })
              })
            })
          }}
        >
          ↳ Thread
        </button>

        <input
          type="file"
          onChange={(e: any) => {
            ImportData.importFileList(e.target.files, (url) => {
              changeDoc((doc) => {
                doc.items.push(url)
              })
            })
          }}
          ref={hiddenFileInput}
          style={{ display: "none" }}
        />
      </div>
    </div>
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
