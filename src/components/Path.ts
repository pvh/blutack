import React from "react"

export class Path {
  constructor(
    private readonly setGlobalPath: (path: string) => void,
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
        this.setGlobalPath,
        this.parentPath.concat(part),
        this.currentPath.slice(index + 1)
      ),
    ]
  }

  setPart(part: string) {
    const encodedPart = encodeURIComponent(part)
    const path =
      this.parentPath === "" ? encodedPart : `${this.parentPath}/${encodedPart}`

    this.setGlobalPath(path)
  }

  getFullUrl(): string {
    return this.parentPath.concat(this.currentPath)
  }
}

export const PathContext = React.createContext<Path | undefined>(undefined)
