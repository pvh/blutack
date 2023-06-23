import React from "react"
import "./Heading.css"
import Heading from "./Heading"
import SecondaryText from "./SecondaryText"
import TitleEditor from "../../../components/TitleEditor"
import "./TitleWithSubtitle.css"
import { DocumentId } from "automerge-repo"

export interface Props {
  title: string
  wrapTitle?: boolean
  titleEditorField?: string // for StoragePeer, which has a name, not a title
  subtitle?: string
  editable?: boolean
  href?: string // this is because URL Content wants to have a link as its secondary text :/
  documentId: DocumentId
  bold?: boolean
}

export default function TitleWithSubtitle(props: Props) {
  const {
    title,
    wrapTitle,
    titleEditorField,
    editable = false,
    subtitle,
    href,
    documentId,
    bold = false,
  } = props

  return (
    <div className="TitleWithSubtitle">
      {editable ? (
        <TitleEditor
          field={titleEditorField}
          placeholder={title}
          documentId={documentId}
          bold={bold}
        />
      ) : (
        <Heading
          wrap={wrapTitle}
          style={{
            fontWeight: bold ? undefined : "normal",
          }}
        >
          {title}
        </Heading>
      )}
      {subtitle && (
        <SecondaryText>
          {href ? <a href={href}>{subtitle}</a> : subtitle}
        </SecondaryText>
      )}
    </div>
  )
}
