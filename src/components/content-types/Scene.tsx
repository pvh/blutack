import React, { useRef, useMemo, useState } from "react"

import * as ContentTypes from "../pushpin-code/ContentTypes"
import Content, { ContentProps, EditableContentProps } from "../Content"
import { createDocumentLink, isPushpinUrl } from "../pushpin-code/ShareLink"
import ListItem from "../ui/ListItem"
import Badge from "../ui/Badge"
import ContentDragHandle from "../ui/ContentDragHandle"
import TitleWithSubtitle from "../ui/TitleWithSubtitle"
import "./Scene.css"
import { useDocument } from "automerge-repo-react-hooks"
import { Canvas, MeshProps, useFrame } from "react-three-fiber"
import * as THREE from "three"

import { DocHandle } from "automerge-repo"
import * as ImportData from "../pushpin-code/ImportData"

interface Doc {
  title?: string
}

Scene.minWidth = 9
Scene.minHeight = 6
Scene.defaultWidth = 16
Scene.defaultHeight = 18
Scene.maxWidth = 24
Scene.maxHeight = 36

import five from "./five.png"

interface BoxProps {
  position: [number, number, number]
}
const Box = (props: BoxProps) => {
  // This reference will give us direct access to the mesh
  const mesh = useRef<MeshProps>()

  // Set up state for the hovered and active state
  const [active, setActive] = useState(false)

  // Rotate mesh every frame, this is outside of React without overhead
  useFrame(() => {
    if (!mesh.current) {
      return
    }
    mesh.current.rotation.x = mesh.current.rotation.y += 0.01
  })

  const texture = useMemo(() => new THREE.TextureLoader().load(five), [])

  return (
    <mesh
      {...props}
      ref={mesh}
      scale={active ? [2, 2, 2] : [1.5, 1.5, 1.5]}
      onClick={(e) => setActive(!active)}
    >
      <boxBufferGeometry args={[1, 1, 1]} />
      <meshBasicMaterial attach="material" transparent side={THREE.DoubleSide}>
        <primitive attach="map" object={texture} />
      </meshBasicMaterial>
    </mesh>
  )
}

export default function Scene(props: ContentProps) {
  const [doc, changeDoc] = useDocument<Doc>(props.documentId)

  if (!doc) {
    return null
  }

  return (
    <div className="sceneWrapper">
      <Canvas>
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
        <pointLight position={[-10, -10, -10]} />
        <Box position={[-1.2, 0, 0]} />
        <Box position={[2.5, 0, 0]} />
      </Canvas>
    </div>
  )
}

export function SceneInList(props: EditableContentProps) {
  const { documentId, url, editable } = props
  const [doc] = useDocument<Doc>(documentId)
  if (!doc) return null

  const title =
    doc.title != null && doc.title !== "" ? doc.title : "Untitled scene"
  const subtitle = ""

  return (
    <ListItem>
      <ContentDragHandle url={url}>
        <Badge size="medium" icon={icon} />
      </ContentDragHandle>
      <TitleWithSubtitle
        titleEditorField="title"
        title={title}
        documentId={documentId}
        editable={editable}
      />
    </ListItem>
  )
}

function stopPropagation(e: React.SyntheticEvent) {
  e.stopPropagation()
  e.nativeEvent.stopImmediatePropagation()
}

function create(unusedAttrs: any, handle: DocHandle<any>) {
  handle.change((doc) => {
    // TODO
  })
}

const icon = "cubes"

ContentTypes.register({
  type: "scene",
  name: "Scene",
  icon,
  contexts: {
    workspace: Scene,
    board: Scene,
    list: SceneInList,
    "title-bar": SceneInList,
  },
  create,
})
