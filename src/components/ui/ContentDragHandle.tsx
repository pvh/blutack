import React, { ReactNode, useRef } from 'react'
import './Heading.css'
import mime from 'mime-types'
import * as UriList from '../pushpin-code/UriList'
import './ContentDragHandle.css'

interface SimpleProps {
  url: PushpinUrl
  children: ReactNode
}
interface FileProps extends SimpleProps {
  filename: string
  extension: string
  hyperfileUrl: HyperfileUrl
}

export type Props = SimpleProps | FileProps

export default function ContentDragHandle(props: Props) {
  const { url, children } = props
  const ref = useRef<HTMLSpanElement>(null)
  const hyperfileUrl = 'hyperfileUrl' in props ? props.hyperfileUrl : null
  const header = useHyperfileHeader(hyperfileUrl)

  const onDragStart = (event: React.DragEvent<HTMLSpanElement>) => {
    if (ref.current) {
      event.dataTransfer.setDragImage(ref.current, 0, 0)
    }

    event.dataTransfer.setData(UriList.MIME_TYPE, url)

    // and we'll add a DownloadURL if we need to
    if ('hyperfileUrl' in props && header) {
      const { hyperfileUrl, filename, extension } = props
      const { mimeType } = header

      const outputExtension = extension || mime.extension(mimeType) || ''

      const downloadUrl = `text:${filename}.${outputExtension}:${hyperfileUrl}`
      event.dataTransfer.setData('DownloadURL', downloadUrl)
    }
  }

  return (
    <span draggable ref={ref} onDragStart={onDragStart} className="ContentDragHandle">
      {children}
    </span>
  )
}
