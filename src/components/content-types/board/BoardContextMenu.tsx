import React, { useRef, useState, memo } from "react"
import classNames from "classnames"
import { ContextMenu, MenuItem as ContextMenuItem } from "react-contextmenu"
declare module "react-contextmenu" {
  interface ContextMenuProps {
    children?: React.ReactNode
  }
  interface MenuItemProps {
    children?: React.ReactNode
  }
}

import "./ContextMenu.css"
import * as ContentTypes from "../../../bootstrap/lib/blutack/ContentTypes"
import { importFileList } from "../../../bootstrap/lib/blutack/ImportData"
import { BoardAction } from "./Board"
import { gridOffset, Position } from "./BoardGrid"
import ColorPicker from "../../../bootstrap/lib/ui/ColorPicker"

interface Props {
  contentTypes: ContentTypes.LookupResult[]
  boardTitle: string
  backgroundColor: string
  backgroundColors: string[]
  dispatch(action: BoardAction): void
}

function BoardContextMenu(props: Props) {
  const [contextMenuPosition, setContextMenuPosition] = useState<Position>({
    x: 0,
    y: 0,
  })

  const addContent = (e: any, contentType: ContentTypes.LookupResult) => {
    e.stopPropagation()

    if (!contextMenuPosition) {
      return
    }

    const position = contextMenuPosition

    switch (contentType.type) {
      case "board":
        ContentTypes.create(
          "board",
          {
            title: `Sub-board of ${props.boardTitle}`,
          },
          (url) => {
            props.dispatch({
              type: "AddCardForContent",
              card: { x: position.x, y: position.y, url },
            })
          }
        )
        break
      default:
        ContentTypes.create(contentType.type, {}, (url) => {
          props.dispatch({
            type: "AddCardForContent",
            card: { x: position.x, y: position.y, url },
          })
        })
    }
  }

  const createMenuItems = props.contentTypes.map((contentType) => (
    <ContextMenuItem
      key={contentType.type}
      onClick={(e) => addContent(e, contentType)}
    >
      <div className="ContextMenu__iconBounding ContextMenu__iconBounding--note">
        <i className={classNames("fa", `fa-${contentType.icon}`)} />
      </div>
      <span className="ContextMenu__label">{contentType.name}</span>
    </ContextMenuItem>
  ))

  const hiddenFileInput = useRef<HTMLInputElement>(null)
  const onImportClick = () => {
    if (hiddenFileInput.current) {
      hiddenFileInput.current.click()
    }
  }
  const onFilesChanged = (e: any) => {
    importFileList(e.target.files, (url, i) => {
      const position = gridOffset(contextMenuPosition, i)
      props.dispatch({
        type: "AddCardForContent",
        card: { x: position.x, y: position.y, url },
      })
    })
  }

  const onShowContextMenu = (e: any) => {
    setContextMenuPosition({
      x: e.detail.position.x - e.detail.target.parentElement.offsetTop,
      y: e.detail.position.y - e.detail.target.parentElement.offsetLeft,
    })
  }

  const colors = props.backgroundColors

  const onChangeComplete = (color: any) =>
    props.dispatch({ type: "ChangeBackgroundColor", color })

  return (
    <ContextMenu
      id="BoardMenu"
      onShow={onShowContextMenu}
      className="ContextMenu"
    >
      <div className="ContextMenu__section">{createMenuItems}</div>

      <div className="ContextMenu__section">
        <div className="ContextMenu__divider" />
        <input
          type="file"
          id="hiddenImporter"
          multiple
          onChange={onFilesChanged}
          ref={hiddenFileInput}
          style={{ display: "none" }}
        />
        <ContextMenuItem key="import" onClick={onImportClick}>
          <div className="ContextMenu__iconBounding ContextMenu__iconBounding--note">
            <i className={classNames("fa", `fa-download`)} />
          </div>
          <span className="ContextMenu__label">Import files...</span>
        </ContextMenuItem>
        <div className="ContextMenu__divider" />
      </div>
      <div className="ContextMenu__section">
        <h6>Board Color</h6>
        <div className="ContextMenu__divider" />
        <ContextMenuItem>
          <ColorPicker
            color={props.backgroundColor}
            colors={props.backgroundColors}
            onChange={() => {}}
            onChangeComplete={onChangeComplete}
          />
        </ContextMenuItem>
      </div>
    </ContextMenu>
  )
}

export default memo(BoardContextMenu)
