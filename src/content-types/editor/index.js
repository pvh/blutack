const { useEffect, useRef } = React
const { useDocument, Modules, Context, CodeMirror } = Blutack


export default function Editor(props) {
  const [doc, changeDoc] = useDocument(props.documentId)
  const [profile, changeProfile] = Context.useProfile()

  if (!doc) {
    return null
  }

  if (doc.source === undefined) {
    return <div>Document has no editable source</div>
  }

  const onChangeSource = async (source) => {
    changeDoc((doc) => {
      doc.source = source

      try {
        const transformedCode = Modules.transformSource(source)
        if (!transformedCode.code) {
          return
        }

        doc.dist = transformedCode.code
      } catch (error) {
        console.error(error)
      }
    })

    const module = await Modules.load(props.documentId)

    // update registration in profile depending on weather the module defines a content type
    changeProfile((profile) => {
      if (!profile.contentTypeIds) {
        profile.contentTypeIds = []
      }

      const indexOfModule = profile.contentTypeIds.indexOf(props.documentId)

      if (module.contentType && indexOfModule === -1) {
        profile.contentTypeIds.push(props.documentId)
      } else if (!module.contentType && indexOfModule !== -1) {
        profile.contentTypeIds.splice(indexOfModule, 1)
      }

        
      // add content type to document so the type is known when exporting it without parsing the js
      // todo: figure out a more principled way to do this
      changeDoc((doc) => {
        if (module.contentType) {      
          doc.contentType = module.contentType.type
        } else {
          delete doc.contentType
        }
      })
    })
  }

  return (
    <div className="w-full h-full">
      <CodeMirror source={doc.source} onChangeSource={onChangeSource} />
    </div>
  )
}


export const contentType = {
  type: "editor",
  name: "Editor",
  icon: "file-code",
  contexts: {
    root: Editor,
    board: Editor,
    expanded: Editor,
  },
  unlisted: true,
  dontAddToViewedDocUrls: true,
}
