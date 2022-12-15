import { LastSeenHeads } from "../components/pushpin-code/Changes"
import { HasBadge, readAsHasBadge } from "./HasBadge"
import { HasTitle, readAsHasTitle } from "./HasTitle"

type Schemas = {
  HasTitle: HasTitle
  HasBadge: HasBadge
}

type SchemaName = keyof Schemas

function exhaustiveCheck(_v: never) {}

// TODO: use a type variable to narrow the output, couldn't get it working for some reason
export const readWithSchema = ({
  doc,
  type,
  lastSeenHeads,
  schema,
}: {
  doc: any
  type: string
  lastSeenHeads: LastSeenHeads | undefined // TODO: weird that this gets passed in from outside?
  schema: SchemaName
}): any => {
  switch (schema) {
    case "HasTitle":
      return readAsHasTitle(doc, type)
    case "HasBadge":
      return readAsHasBadge(doc, type, lastSeenHeads)
    default:
      exhaustiveCheck(schema)
  }
}
