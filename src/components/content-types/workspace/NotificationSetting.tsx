import { DocumentId } from "automerge-repo"
import { useDocument } from "automerge-repo-react-hooks"
import { Popover } from "../../ui/Popover"
import Badge from "../../ui/Badge"
import ListMenuItem from "../../ui/ListMenuItem"
import React from "react"
import ListMenu from "../../ui/ListMenu"
import * as ContentTypes from "../../pushpin-code/ContentTypes"
import { parseDocumentLink, PushpinUrl } from "../../pushpin-code/Url"
import { hasDocUnseenChanges, LastSeenHeads } from "../../pushpin-code/Changes"
import { Doc } from "@automerge/automerge"
import content from "../../Content"
import { useViewState } from "../../pushpin-code/ViewState"

type NotificationMode = "all" | "never" | "mentions"

interface DocWithNotificationSettings {
  notificationMode: NotificationMode
}

interface NotificationSettingProps {
  currentDocumentUrl: PushpinUrl
}

export default function NotificationSetting({
  currentDocumentUrl,
}: NotificationSettingProps) {
  const docLink = parseDocumentLink(currentDocumentUrl)

  // todo: this is bad
  // but i think it's better to have an obvious ugly condition here that screams for a better solution
  // than introducing a weird context like "notification-setting" that effectively achieves the same thing as this condition
  const [currentContent] = useViewState<PushpinUrl | undefined>(
    docLink.documentId,
    "currentContent"
  )

  let docId: DocumentId | undefined

  if (docLink.type === "contentlist") {
    docId = currentContent
      ? parseDocumentLink(currentContent).documentId
      : undefined
  } else {
    docId = docLink.documentId
  }

  const [doc, changeDoc] = useDocument<DocWithNotificationSettings>(docId)

  if (!doc) {
    return null
  }

  const changeMode = (mode: NotificationMode) => {
    changeDoc((doc) => (doc.notificationMode = mode))
  }

  const notificationMode = doc.notificationMode ?? "mentions"

  const icon = notificationMode === "never" ? "bell-slash" : "bell"

  return (
    <Popover
      closeOnClick={true}
      trigger={
        <Badge
          size="medium"
          icon={icon}
          backgroundColor={
            notificationMode === "all" ? "var(--colorWarning)" : undefined
          }
        />
      }
      placement="bottom"
    >
      <div
        style={{
          margin: "var(--halfCellSize)",
          marginBottom: 0,
          fontWeight: "bold",
        }}
      >
        Notify of changes
      </div>
      <ListMenu>
        <ListMenuItem
          selected={notificationMode === "all"}
          onClick={() => changeMode("all")}
        >
          {notificationMode === "all" && <span className="check" />} all
        </ListMenuItem>
        <ListMenuItem
          selected={notificationMode === "never"}
          onClick={() => changeMode("never")}
        >
          {notificationMode === "never" && <span className="check" />} never
        </ListMenuItem>
        <ListMenuItem
          selected={notificationMode === "mentions"}
          onClick={() => changeMode("mentions")}
        >
          {notificationMode === "mentions" && <span className="check" />} when
          mentioned
        </ListMenuItem>
      </ListMenu>
    </Popover>
  )
}

export function shouldNotifyAboutDocChanges(
  type: string,
  doc: Doc<unknown>,
  lastSeenHeads: LastSeenHeads | undefined,
  name: string
) {
  const contentType = ContentTypes.typeNameToContentType(type)

  if (!contentType) {
    return false
  }

  const notificationMode =
    (doc as DocWithNotificationSettings).notificationMode ?? "mentions"

  switch (notificationMode) {
    case "all":
      return contentType.hasUnseenChanges
        ? contentType.hasUnseenChanges(doc, lastSeenHeads)
        : false
    case "never":
      return false
    case "mentions":
      return contentType.hasUnseenMentions
        ? contentType.hasUnseenMentions(doc, lastSeenHeads, name)
        : false
  }
}
