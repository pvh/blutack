import { DocumentId } from "automerge-repo"
import { useDocument } from "automerge-repo-react-hooks"
import { Popover } from "../../ui/Popover"
import Badge from "../../ui/Badge"
import ListMenuItem from "../../ui/ListMenuItem"
import React from "react"
import ListMenu from "../../ui/ListMenu"

type NotificationMode = "all" | "never" | "mentions"

interface DocWithNotificationSettings {
  notificationMode: NotificationMode
}

interface NotificationSettingProps {
  documentId: DocumentId
}

export default function NotificationSetting({
  documentId,
}: NotificationSettingProps) {
  const [doc, changeDoc] = useDocument<DocWithNotificationSettings>(documentId)

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
