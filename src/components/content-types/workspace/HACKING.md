# Blutackathon

How to make a Blutack widget.

Conceptually, Blutack takes an Automerge document and passes it to your code. Your code renders an interface to that document and (optionally) any other blutack documents you find beneath it.

## Option A: Use Widget Editor

The widget editor wraps up your code as a sort of pseudo-React component. Your job is to write a function with the following signature:

({doc, changeDoc}) => React.Node[]

To start making a widget, create one with the + icon, then click the little pencil in the top right corner of the document to start editing the code.

## Option B: Check It In

If you want to do something that requires external dependencies or is more complicated than makes sense to put in one file, you can try checking the code in.

The premise is similar, but you'll need to hook the component into a couple of extra places.

Start by copying an existing simple widget. I recommend Device.tsx. Delete the "guts", rename it and save it as `YourThing.tsx`. Here's what that might look like:

```typescript

import React, { useCallback, useEffect, useState } from "react"

import { ContentType } from "../pushpin-code/ContentTypes"
import { useDocument } from "automerge-repo-react-hooks"
import { ContentProps } from "../Content"
import {
  createDocumentLink,
  isPushpinUrl,
  openDoc,
  parseDocumentLink,
  PushpinUrl,
} from "../pushpin-code/Url"
import { DocumentId } from "automerge-repo"
import * as Automerge from "@automerge/automerge"

export default function MyThing(props: ContentProps) {
  const [doc, changeDoc] = useDocument(props.documentId)
  
  if (!doc) { return null }
  return (
    <div className="MyThing">
      My Thing Goes Here
    </div>
  )
}

function create(unusedAttrs: any, handle: DocHandle<any>) {
  handle.change((doc) => {
    doc.stuff = []
  })
}

export const contentType: ContentType = {
  type: "mything",
  name: "MyThing",
  icon: "file-code",
  contexts: {
    root: MyThing,
    board: MyThing,
    expanded: MyThing,
  },
  create,
  unlisted: false,
}

```

The extra bit at the bottom is the definition of content type. This tells Blutack a few useful things about your component, mostly what it's called, how to make one, and what the icon should be. The "contexts" thing is a legacy of some past design decisions and we should probably just get rid of it but haven't yet. You can ignore it for our purposes here.

The last step you need to take to hook this into the application is to add a couple of lines to `Root.tsx`. Cargo cult what you see there but roughly those two lines are:

```

import * as MyThing from "./content-types/MyThing"
ContentTypes.register(MyThing.contentType)

```

