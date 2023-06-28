const{ useCallback, useEffect, useState } = React
const {
  Url, useDocument, Automerge
} = Blutack
const { ReactJson } = Ui

const { createDocumentLink, isPushpinUrl, openDocument, parseDocumentLink } = Url

export default function RawView(props) {
  const [doc, changeDoc] = useDocument(props.documentId)
  const [isMetaPressed, setIsAltPressed] = useState(false)

  const onEdit = useCallback(
    ({ namespace, new_value, name }) => {
      changeDoc((doc) => {
        let current = doc

        for (const key of namespace) {
          current = current[key]
        }

        current[name] = new_value
      })
    },
    [changeDoc]
  )

  const onAdd = useCallback(() => true, [])
  const onDelete = useCallback(
    ({ namespace, name }) => {
      changeDoc((doc) => {
        let current = doc

        for (const key of namespace) {
          current = current[key]
        }

        delete current[name]
      })
    },
    [changeDoc]
  )

  const onSelect = useCallback(
    ({ value }) => {
      if (!(typeof value === "string")) {
        return
      }

      if (isPushpinUrl(value)) {
        openDocument(
          isMetaPressed ? createDocumentLink("raw", parseDocumentLink(value).documentId) : value
        )
      } else if (isDocumentId(value)) {
        openDocument(createDocumentLink("raw", value))
      }
    },
    [changeDoc]
  )

  useEffect(() => {
    const onKeyDown = (evt) => {
      setIsAltPressed(evt.altKey)
    }
    const onKeyUp = (evt) => {
      setIsAltPressed(evt.altKey)
    }

    document.addEventListener("keydown", onKeyDown, true)
    document.addEventListener("keyup", onKeyUp, true)

    return () => {
      document.removeEventListener("keydown", onKeyDown, true)
      document.removeEventListener("keyup", onKeyUp, true)
    }
  }, [setIsAltPressed])

  if (!doc) {
    return null
  }

  var blobUrl = URL.createObjectURL(new Blob([Automerge.save(doc)]))

  return (
    <div className="RawView">
      <ReactJson src={doc} onEdit={onEdit} onAdd={onAdd} onDelete={onDelete} onSelect={onSelect} />
      <a href={blobUrl} download={props.documentId + ".amrg"}>
        Download this document...
      </a>
    </div>
  )
}

function isDocumentId(value) {
  return /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/.test(
    value
  )
}

export const contentType = {
  type: "raw",
  name: "Raw",
  icon: "file-code",
  contexts: {
    root: RawView,
    board: RawView,
    expanded: RawView,
  },
  unlisted: true,
  dontAddToViewedDocUrls: true,
}
