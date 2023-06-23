import { LastSeenHeads } from "../lib/blutack/Changes"
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
  schema,
  props,
}: {
  doc: any
  type: string
  schema: SchemaName
  props: any // TODO: we shouldn't pass in parameters
  // this is currently necessary because some data is only available through react context, like the current profile
  // computations that depend on data in react context are currently performed outside of the lense and the result is passed in
}): any => {
  switch (schema) {
    case "HasTitle":
      return readAsHasTitle(doc, type)
    case "HasBadge":
      return readAsHasBadge(doc, type, props.lastSeenHeads, props.selfId, props.selfName)
    default:
      exhaustiveCheck(schema)
  }
}
