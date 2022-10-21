import React, { useCallback, useEffect, useMemo, useState } from "react"
import { createDocumentLink, isPushpinUrl } from "./pushpin-code/ShareLink"

export class Path {
  constructor(
    private readonly onChangePath: (path: string) => void,
    readonly parentPath: string,
    readonly currentPath: string
  ) {}

  getPart() {
    const indexOfNextSlash = this.currentPath.indexOf("/")
    const index =
      indexOfNextSlash === -1 ? this.currentPath.length : indexOfNextSlash
    const part = this.currentPath.slice(0, index)

    return [
      decodeURIComponent(part),
      new Path(
        this.onChangePath,
        this.parentPath.concat(part),
        this.currentPath.slice(index + 1)
      ),
    ]
  }

  setPart(part: string) {
    const encodedPart = encodeURIComponent(part)
    const path =
      this.parentPath === "" ? encodedPart : `${this.parentPath}/${encodedPart}`

    this.onChangePath(path)
  }

  getFullUrl(): string {
    return this.parentPath.concat(this.currentPath)
  }
}

export const PathContext = React.createContext<Path | undefined>(undefined)

export function useRootPath() {
  const [path, setPath] = useState(getCurrentPath())

  const onChangePath = useCallback((path: string) => {
    setPath(path)
    // todo: remove reference to "/blutack/"
    history.pushState(null, "", `/blutack/${path}`)
  }, [])

  useEffect(() => {
    const onPopState = (event: PopStateEvent) => {
      setPath(getCurrentPath())
    }
    addEventListener("popstate", onPopState)

    return () => {
      removeEventListener("popstate", onPopState)
    }
  }, [])

  return useMemo(() => new Path(onChangePath, "", path), [path])
}

function getCurrentPath() {
  // todo: remove reference to "/blutack/"
  return location.pathname.slice("/blutack/".length)
}
