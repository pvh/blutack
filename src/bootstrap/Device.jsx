import React from "react";

export function create(deviceAttrs, handle) {
  handle.change((doc) => {
    doc.name = "computer"
    doc.icon = "desktop"
  })
  // TODO: this stuff relied on electron magic to pick an icon and set a useful hostname
  //       really we should look at the user agent or something instead
  const isLaptop = true
  const icon = isLaptop ? "laptop" : "desktop"
  handle.change((doc) => {
    doc.name = icon
    doc.icon = icon
  })
}

export const contentType = {
  type: "device",
  name: "Device",
  icon: "desktop",
  contexts: {
  },
  resizable: false,
  unlisted: true,
  create
}

export const CurrentDeviceContext = React.createContext(undefined)
