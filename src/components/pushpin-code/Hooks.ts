import { Doc } from "@automerge/automerge"
import { DocumentId, DocCollection, DocHandle } from "automerge-repo"
import { useDocument, useRepo } from "automerge-repo-react-hooks"
import {
  useEffect,
  useState,
  useRef,
  useCallback,
  createContext,
  useContext,
} from "react"

export type ChangeFn<T> = (cb: (doc: T) => void) => void

type Cleanup = void | (() => void)

export interface DocMap<T> {
  [id: DocumentId]: T
}

export function useDocuments<T>(docIds: DocumentId[]): DocMap<T> {
  const handlersRef = useRef<DocMap<DocHandle<T>>>({})
  const repo = useRepo()
  const [documents, setDocuments] = useState<DocMap<T>>({})

  function setSingleDocument(id: DocumentId, doc: T) {
    setDocuments((textDocs) => ({
      ...textDocs,
      [id]: doc,
    }))
  }

  const handlers = handlersRef.current
  const prevHandlerIds = Object.keys(handlers)

  docIds.forEach((id) => {
    if (handlers[id]) {
      return
    }

    const handler = (handlers[id] = repo.find<T>(id))
    handler.value().then((doc) => {
      setSingleDocument(id as DocumentId, doc)
    })
    handler.on("change", (evt) => {
      setSingleDocument(id as DocumentId, evt.handle.doc)
    })
  })

  prevHandlerIds.forEach((id) => {
    if (handlers[id as DocumentId]) {
      return
    }

    const handler = handlers[id as DocumentId]
    handler.off("change")
    delete handlers[id as DocumentId]

    setDocuments((textDocs) => {
      const copy = { ...textDocs }
      delete copy[id as DocumentId]
      return copy
    })
  })

  return documents
}

export function useDocumentReducer<D, A>(
  documentId: DocumentId | undefined,
  reducer: (doc: D, action: A) => void,
  deps?: any[]
): [Doc<D> | undefined, (action: A) => void] {
  const [doc, changeDoc] = useDocument<D>(documentId)

  const dispatch = useCallback(
    (action: A) => {
      changeDoc((doc: D) => {
        reducer(doc, action)
      })
    },
    [deps]
  )

  return [doc, dispatch]
}

export function useInterval(ms: number, cb: () => void, deps: any[]) {
  useEffect(() => {
    const id = setInterval(cb, ms)

    return () => {
      clearInterval(id)
    }
  }, deps)
}

/**
 * Starts a timeout when `cond` is first set to true.
 * The timeout can be restarted by calling the returned `reset` function.
 *
 * @remarks
 * The timeout is cancelled when `cond` is set to false.
 */
export function useTimeoutWhen(cond: boolean, ms: number, cb: () => void) {
  const reset = useRef(() => {})

  useEffect(() => {
    if (!cond) {
      reset.current = () => {}
      return () => {}
    }

    let id: NodeJS.Timeout

    reset.current = () => {
      id != null && clearTimeout(id)
      id = setTimeout(cb, ms)
    }

    reset.current()

    return () => {
      clearTimeout(id)
    }
  }, [cond])

  return () => reset.current()
}

/**
 * Manages a set of timeouts keyed by type `K`.
 *
 * @remarks
 * Returns a tuple containing two functions:
 * A function of a key to reset a timeout back to `ms`.
 * A function of a key to perform a timeout early.
 */
export function useTimeouts<K>(
  ms: number,
  onTimeout: (key: K) => void
): [(key: K) => void, (key: K) => void] {
  const timeoutIds = useRef<Map<K, NodeJS.Timeout>>(new Map())
  const timedOut = useStaticCallback((key: K) => {
    timeoutIds.current.delete(key)
    onTimeout(key)
  })

  const bump = useCallback(
    (key: K) => {
      const timeoutId = timeoutIds.current.get(key)
      if (timeoutId) clearTimeout(timeoutId)
      timeoutIds.current.set(
        key,
        setTimeout(() => timedOut(key), ms)
      )
    },
    [onTimeout]
  )

  useEffect(() => {
    return () => {
      timeoutIds.current.forEach((id) => clearTimeout(id))
      timeoutIds.current.clear()
    }
  }, [])

  return [bump, timedOut]
}

type InputEvent =
  | React.ChangeEvent<HTMLInputElement>
  | React.KeyboardEvent<HTMLInputElement>

/**
 * Manages the state and events for an input element for which the input's value
 * is only needed after a confirmation via the enter key.
 *
 * @remarks
 * Returns `[value, onEvent]`.
 * Pass `value` to the input's `value` prop, and
 * pass `onEvent` to both `onChange` and `onKeyDown`.
 */
export function useConfirmableInput(
  value: string,
  onConfirm: (val: string) => void
): [string, (e: InputEvent) => void] {
  const [str, setStr] = useState<string | null>(null)

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    setStr(e.target.value)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    switch (e.key) {
      case "Enter":
        if (str !== null) {
          onConfirm(str)
          setStr(null)
        }
        e.currentTarget.blur()
        break

      case "Backspace":
        e.stopPropagation()
        break

      case "Escape":
        e.currentTarget.blur()
        setStr(null)
        break
    }
  }

  function onEvent(e: InputEvent) {
    switch (e.type) {
      case "change":
        onChange(e as React.ChangeEvent<HTMLInputElement>)
        break
      case "keydown":
        onKeyDown(e as React.KeyboardEvent<HTMLInputElement>)
        break
    }
  }

  return [str != null ? str : value, onEvent]
}

export function useEvent<K extends keyof HTMLElementEventMap>(
  target: HTMLElement,
  type: K,
  cb: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any
): void
export function useEvent<K extends keyof DocumentEventMap>(
  target: Document,
  type: K,
  cb: (this: Document, ev: DocumentEventMap[K]) => any
): void
export function useEvent<K extends string>(
  target: EventTarget | null,
  type: K,
  cb: (this: HTMLElement, ev: any) => void
): void
export function useEvent<K extends string>(
  target: EventTarget | null,
  type: K,
  cb: (this: EventTarget, ev: Event) => void
): void {
  useEffect(() => {
    if (target == null) return () => {}

    target.addEventListener(type, cb)

    return () => {
      target.removeEventListener(type, cb)
    }
  }, [target, type, cb])
}
/**
 * Creates a constant reference for the given function.
 * Always returns the same function.
 *
 * @remarks
 *
 * `useCallback` closes over the deps at the time they're passed in, whereas `useStaticCallback`
 * always calls the latest callback. This is generally a good thing, but it's worth noting that it
 * could result in a race condition.
 */
export function useStaticCallback<T extends (...args: any[]) => any>(
  callback: T
): T {
  const cb = useRef<T>(callback)
  cb.current = callback

  return useCallback((...args: any[]) => cb.current(...args), []) as T
}

type Setter<T> = ((state: T) => T) | T
/**
 * Provides access to shared mutable state via hook interface. Provided
 * handle object used as key to which shared state is associated with
 * there for thing wishing to share the state will need to share the handle.
 */
export function useSharedState<T>(
  id: string,
  defaultValue: T
): [T, (v: Setter<T>) => void] {
  const atom = Atom.new(id, defaultValue)
  const [state, setState] = useState(atom.value)
  useEffect((): (() => void) => {
    atom.watch(setState)
    return () => atom.unwatch(setState)
  }, [])

  const setSharedState: any = (t: any) => {
    if (typeof t === "function") {
      atom.transact(t as any)
    } else {
      atom.swap(t)
    }
  }

  return [state, setSharedState]
}

class Atom<T> {
  value: T
  watchers: ((state: T) => any)[]
  static new<T>(id: string, value: T): Atom<T> {
    if (atoms.has(id)) {
      return atoms.get(id)
    }
    const atom = new Atom(value)
    atoms.set(id, atom)
    return atom
  }
  constructor(value: T) {
    this.value = value
    this.watchers = []
  }
  transact(f: (inn: T) => T) {
    this.value = f(this.value)
    this.notify()
  }
  swap(value: T) {
    this.value = value
    this.notify()
  }
  notify() {
    const { value, watchers } = this
    watchers.forEach((watcher) => watcher(value))
  }
  watch(watcher: (state: T) => any) {
    this.watchers.push(watcher)
  }
  unwatch(watcher: (state: T) => any) {
    const index = this.watchers.indexOf(watcher)
    if (index >= 0) {
      this.watchers.splice(index, index + 1)
    }
  }
}

const atoms = new Map()
