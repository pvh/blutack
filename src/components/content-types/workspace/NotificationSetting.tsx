import { DocumentId } from "automerge-repo"
import { useDocument } from "automerge-repo-react-hooks"
import { Popover } from "../../ui/Popover"
import Badge from "../../ui/Badge"
import ListMenuItem from "../../ui/ListMenuItem"
import React from "react"
import ListMenu from "../../ui/ListMenu"
import * as ContentTypes from "../../pushpin-code/ContentTypes"
import { parseDocumentLink, PushpinUrl } from "../../pushpin-code/Url"
import { LastSeenHeads } from "../../pushpin-code/Changes"
import { Doc } from "@automerge/automerge"
import { useViewState } from "../../pushpin-code/ViewState"
import { useSelfId } from "../../pushpin-code/SelfHooks"
import ListMenuSection from "../../ui/ListMenuSection"

type NotificationMode = "all" | "never" | "mentions"

interface DocWithNotificationSettings {
  __notificationModeByUser: { [userId: DocumentId]: NotificationMode }
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
          backgroundColor={
            notificationMode === "all" ? "var(--colorWarning)" : undefined
          }
        />
      }
      alignment="right"
    >
      <ListMenuSection title="Notify of changes">
        <ListMenu>
          <ListMenuItem
            selected={notificationMode === "all"}
            onClick={() => changeMode("all")}
          >
            {notificationMode === "all" && <span className="check" />} always
          </ListMenuItem>
          <ListMenuItem
            selected={notificationMode === "mentions"}
            onClick={() => changeMode("mentions")}
          >
            {notificationMode === "mentions" && <span className="check" />} when
            mentioned
          </ListMenuItem>
          <ListMenuItem
            selected={notificationMode === "never"}
            onClick={() => changeMode("never")}
          >
            {notificationMode === "never" && <span className="check" />} never
          </ListMenuItem>
        </ListMenu>
      </ListMenuSection>
    </Popover>
  )
}

export function shouldNotifyAboutDocChanges(
  type: string,
  doc: Doc<unknown>,
  lastSeenHeads: LastSeenHeads | undefined,
  contactId: DocumentId,
  name: string
) {
  const contentType = ContentTypes.typeNameToContentType(type)

  if (!contentType) {
    return false
  }

  switch (
    getNotificationModeOfDocForUser(
      doc as DocWithNotificationSettings,
      contactId
    )
  ) {
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

function getNotificationModeOfDocForUser(
  doc: DocWithNotificationSettings,
  userId: DocumentId
): NotificationMode {
  return doc.__notificationModeByUser?.[userId] ?? "mentions"
}
