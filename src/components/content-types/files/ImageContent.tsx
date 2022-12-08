/* eslint-disable jsx-a11y/alt-text */
/* our unfluff images don't have meaningful alt-text aside from the title */
import { FileDoc } from "."

import "./ImageContent.css"

import { ContentProps } from "../../Content"
import * as ContentTypes from "../../pushpin-code/ContentTypes"
import Badge from "../../ui/Badge"
import ListItem from "../../ui/ListItem"
import ContentDragHandle from "../../ui/ContentDragHandle"
import TitleWithSubtitle from "../../ui/TitleWithSubtitle"
import { useDocument } from "automerge-repo-react-hooks"
import {
  createBinaryDataUrl,
  useBinaryDataHeader,
} from "../../../blobstore/Blob"
import { ContentListItemProps } from "../ContentList"

function humanFileSize(size: number) {
  const i = size ? Math.floor(Math.log(size) / Math.log(1024)) : 0
  return `${(size / 1024 ** i).toFixed(1)} ${["B", "kB", "MB", "GB", "TB"][i]}`
}

export default function ImageContent({ documentId }: ContentProps) {
  const [doc] = useDocument<FileDoc>(documentId)

  if (!doc) {
    return null
  }
  if (!doc.binaryDataId) {
    return null
  }

  return (
    <img className="Image" alt="" src={createBinaryDataUrl(doc.binaryDataId)} />
  )
}

function ImageInList(props: ContentListItemProps) {
  const { documentId, editable, url, onBlur } = props
  const [doc] = useDocument<FileDoc>(documentId)

  const { title = "", binaryDataId, extension } = doc || {}
  const header = useBinaryDataHeader(binaryDataId)

  if (!binaryDataId) {
    return null
  }

  const { size = null } = header || {}

  const subtitle = `${size !== null ? humanFileSize(size) : "unknown size"}`

  return (
    <ListItem>
      <ContentDragHandle
        url={url}
        filename={title}
        extension={extension}
        binaryDataId={binaryDataId}
      >
        <Badge
          shape="square"
          icon={size ? undefined : "file-image-o"}
          img={size ? createBinaryDataUrl(binaryDataId) : undefined}
        />
      </ContentDragHandle>
      <TitleWithSubtitle
        title={title}
        subtitle={subtitle}
        documentId={documentId}
        editable={editable}
        onBlur={onBlur}
      />
    </ListItem>
  )
}

const supportsMimeType = (mimeType: string) => !!mimeType.match("image/")

ContentTypes.register({
  type: "image",
  name: "Image",
  icon: "file-image-o",
  unlisted: true,
  contexts: {
    workspace: ImageContent,
    board: ImageContent,
    list: ImageInList,
    "title-bar": ImageInList,
  },
  supportsMimeType,
})
