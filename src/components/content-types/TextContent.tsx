import React, { useEffect, useRef, useMemo } from 'react'

import * as Automerge from '@automerge/automerge'
import Quill, { TextChangeHandler, QuillOptionsStatic } from 'quill'
import Delta from 'quill-delta'
import * as ContentTypes from '../pushpin-code/ContentTypes'
import { ContentProps } from '../Content'
import { useDocument } from 'automerge-repo-react-hooks'
import { useStaticCallback } from '../pushpin-code/Hooks'
import './TextContent.css'
import Badge from '../ui/Badge'
import * as ContentData from '../pushpin-code/ContentData'
import * as WebStreamLogic from '../pushpin-code/WebStreamLogic'
import ListItem from '../ui/ListItem'
import ContentDragHandle from '../ui/ContentDragHandle'
import TitleWithSubtitle from '../ui/TitleWithSubtitle'
import { DocHandle } from 'automerge-repo'

interface TextDoc {
  text: Automerge.Text
}

interface Props extends ContentProps {
  uniquelySelected?: boolean
}

TextContent.minWidth = 6
TextContent.minHeight = 2
TextContent.defaultWidth = 15

export default function TextContent(props: Props) {
  const [doc, changeDoc] = useDocument<TextDoc>(props.documentId)

  const [ref] = useQuill({
    text: doc ? doc.text : null,
    change(fn) {
      changeDoc((doc: TextDoc) => fn(doc.text))
    },
    selected: props.uniquelySelected,
    config: {
      formats: [],
      modules: {
        toolbar: false,
        history: {
          maxStack: 500,
          userOnly: true,
        },
      },
    },
  })

  return (
    <div
      className="TextContent"
      ref={ref}
      onCopy={stopPropagation}
      onCut={stopPropagation}
      onPaste={stopPropagation}
      onDoubleClick={stopPropagation}
    />
  )
}

interface QuillOpts {
  text: Automerge.Text | null
  change: (cb: (text: Automerge.Text) => void) => void
  selected?: boolean
  config?: QuillOptionsStatic
}

function useQuill({
  text,
  change,
  selected,
  config,
}: QuillOpts): [React.Ref<HTMLDivElement>, Quill | null] {
  const ref = useRef<HTMLDivElement>(null)
  const quill = useRef<Quill | null>(null)
  // @ts-ignore-next-line
  const textString = useMemo(() => text && text.join(''), [text])
  const makeChange = useStaticCallback(change)

  useEffect(() => {
    if (!ref.current) return () => {}

    const container = ref.current
    const q = new Quill(container, { scrollingContainer: container, ...config })
    quill.current = q

    if (textString) q.setText(textString)
    if (selected) q.focus()

    const onChange: TextChangeHandler = (changeDelta, _oldContents, source) => {
      if (source !== 'user') return

      makeChange((content) => applyDeltaToText(content, changeDelta as any))
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Backspace') return

      const str = q.getText()
      if (str !== '' && str !== '\n') {
        e.stopPropagation()
      }
    }

    q.on('text-change', onChange)

    /**
     * We bind this as a native event because of React's event delegation.
     * Quill will handle the keydown event and cause a react re-render before react has actually
     * seen the event at all. This causes a race condition where the doc looks like it was already
     * empty when Backspace is pressed, even though that very keypress made it empty.
     */
    container.addEventListener('keydown', onKeyDown, { capture: true })

    return () => {
      quill.current = null
      container.removeEventListener('keydown', onKeyDown, { capture: true })
      q.off('text-change', onChange)
      // Quill gets garbage collected automatically
    }
  }, [ref.current]) // eslint-disable-line

  useEffect(() => {
    if (!textString || !quill.current) return

    const delta = new Delta().insert(textString)
    const diff = quill.current.getContents().diff(delta as any)

    quill.current.updateContents(diff)
  }, [textString])

  return [ref, quill.current]
}

function stopPropagation(e: React.SyntheticEvent) {
  e.stopPropagation()
  e.nativeEvent.stopImmediatePropagation()
}

function applyDeltaToText(text: Automerge.Text, delta: Delta): void {
  let i = 0
  delta.forEach((op, idx) => {
    if (op.retain && typeof op.retain == "number") {
      i += op.retain
    }

    if (typeof op.insert === 'string') {
      const chars = op.insert.split('')
      text.insertAt!(i, ...chars)
      i += chars.length
    } else if (op.delete) {
      text.deleteAt!(i, op.delete)
    }
  })
}

async function createFrom(contentData: ContentData.ContentData, handle: DocHandle<TextDoc>) {
  const text = await WebStreamLogic.toString(contentData.data)
  handle.change((doc) => {
    doc.text = new Automerge.Text()
    if (text) {
      doc.text.insertAt!(0, ...text.split(''))

      if (!text || !text.endsWith('\n')) {
        doc.text.insertAt!(text ? text.length : 0, '\n') // Quill prefers an ending newline
      }
    }
  })
}


function create({ text }: any, handle: DocHandle<any>) {
  handle.change((doc) => {
    doc.text = new Automerge.Text(text)
    if (!text || !text.endsWith('\n')) {
      doc.text.insertAt!(text ? text.length : 0, '\n') // Quill prefers an ending newline
    }
  })
}

function TextInList(props: ContentProps) {
  const { documentId, url } = props
  const [doc] = useDocument<TextDoc>(documentId)
  if (!doc) return null

  const lines = doc.text
  //  @ts-ignore-next-line
    .join('')
    .split('\n')
    .filter((l: string[]) => l.length > 0)

  const title = lines.shift() || '[empty text note]'
  const subtitle = lines.slice(0, 2).join('\n')

  return (
    <ListItem>
      <ContentDragHandle url={url}>
        <Badge icon="sticky-note" size="medium" />
      </ContentDragHandle>
      <TitleWithSubtitle
        title={title}
        documentId={documentId}
        editable={false}
      />
    </ListItem>
  )
}

const supportsMimeType = (mimeType: string) => !!mimeType.match('text/')

ContentTypes.register({
  type: 'text',
  name: 'Text',
  icon: 'sticky-note',
  contexts: {
    board: TextContent,
    workspace: TextContent,
    list: TextInList,
    'title-bar': TextInList,
  },
  create,
  createFrom,
  supportsMimeType,
})
