import { DocumentId } from "automerge-repo"
import { useDocument } from "automerge-repo-react-hooks"
import { Popover } from "../../../bootstrap/lib/ui/Popover"
import Badge from "../../../bootstrap/lib/ui/Badge"
import ListMenuItem from "../../../bootstrap/lib/ui/ListMenuItem"
import React from "react"
import ListMenu from "../../../bootstrap/lib/ui/ListMenu"
import * as ContentTypes from "../../../bootstrap/lib/blutack/ContentTypes"
import { parseDocumentLink, PushpinUrl } from "../../../bootstrap/lib/blutack/Url"
import { LastSeenHeads } from "../../../bootstrap/lib/blutack/Changes"
import { Doc } from "@automerge/automerge"
import { useViewState } from "../../../bootstrap/lib/blutack/ViewState"
import { useSelfId } from "../../../bootstrap/lib/blutack/SelfHooks"
import ListMenuSection from "../../../bootstrap/lib/ui/ListMenuSection"

type NotificationMode = "all" | "never" | "mentions"

interface DocWithNotificationSettings {
  __notificationModeByUser: { [userId: DocumentId]: NotificationMode }
}

interface NotificationSettingProps {
  currentDocumentUrl: PushpinUrl
}

export default function NotificationSetting({ currentDocumentUrl }: NotificationSettingProps) {
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
    docId = currentContent ? parseDocumentLink(currentContent).documentId : undefined
  } else {
    docId = docLink.documentId
  }

  const [doc, changeDoc] = useDocument<DocWithNotificationSettings>(docId)
  const selfId = useSelfId()

  if (!doc) {
    return null
  }

  const changeMode = (mode: NotificationMode) => {
    changeDoc((doc) => {
      if (!doc.__notificationModeByUser) {
        doc.__notificationModeByUser = {}
      }

      doc.__notificationModeByUser[selfId] = mode
    })
  }

  const notificationMode = getNotificationModeOfDocForUser(doc, selfId)

  const icon = notificationMode === "never" ? "bell-slash" : "bell"

  return (
    <Popover
      closeOnClick={true}
      trigger={
        <Badge
          size="medium"
          icon={icon}
          backgroundColor={notificationMode === "all" ? "var(--colorWarning)" : undefined}
        />
      }
      alignment="right"
    >
      <ListMenuSection title="Notify me about this document">
        <ListMenu>
          <ListMenuItem selected={notificationMode === "all"} onClick={() => changeMode("all")}>
            {notificationMode === "all" && <span className="check" />} on every change
          </ListMenuItem>
          <ListMenuItem
            selected={notificationMode === "mentions"}
            onClick={() => changeMode("mentions")}
          >
            {notificationMode === "mentions" && <span className="check" />} when mentioned
          </ListMenuItem>
          <ListMenuItem selected={notificationMode === "never"} onClick={() => changeMode("never")}>
            {notificationMode === "never" && <span className="check" />} never
          </ListMenuItem>
        </ListMenu>
      </ListMenuSection>
    </Popover>
  )
}

function getNotificationModeOfDocForUser(
  doc: DocWithNotificationSettings,
  userId: DocumentId
): NotificationMode {
  return doc.__notificationModeByUser?.[userId] ?? "mentions"
}

export function shouldNotifyUserAboutDoc(
  doc: any,
  contactId: DocumentId,
  hasUnseenChanges: boolean,
  hasUnseenMentions: boolean
) {
  switch (getNotificationModeOfDocForUser(doc as DocWithNotificationSettings, contactId)) {
    case "all":
      return hasUnseenChanges
    case "never":
      return false
    case "mentions":
      return hasUnseenMentions
  }
}
