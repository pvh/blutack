// PVH note: this should be part of automerge? Or something. Not here.

/**
 * Helper function for removing an item from an Automerge list.
 */
export function without<T>(val: T, list: T[]) {
  const pos = list.findIndex((item: unknown) => item === val)
  if (!pos) return
  // The Automerge type for deleteAt is wrong.
  list.splice(pos, 1)
}
