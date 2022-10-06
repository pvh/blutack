import { Doc } from "@automerge/automerge"
import { DocumentId, DocCollection, DocHandle } from "automerge-repo"
import { useDocument, useHandle, useRepo } from "automerge-repo-react-hooks"
import {
  useEffect,
  useState,
  useRef,
  useCallback,
  createContext,
  useContext,
} from "react"
import { parseDocumentLink, PushpinUrl } from "./ShareLink"

export type ChangeFn<T> = (cb: (doc: T) => void) => void

type Cleanup = void | (() => void)

export interface DocMap<T> {
  [id: PushpinUrl]: T
}

export interface DocIdMap<T> {
  [id: DocumentId]: T
}

export function useDocumentIds<T>(docIds?: DocumentId[]): DocIdMap<T> {
  const handlersRef = useRef<DocIdMap<DocHandle<T>>>({})
  const repo = useRepo()
  const [documents, setDocuments] = useState<DocIdMap<T>>({})

  if (!docIds) {
    return documents
  }

  const handlers = handlersRef.current
  const prevHandlerIds = Object.keys(handlers) as DocumentId[]

  docIds.forEach((id) => {
    if (handlers[id]) {
      return
    }

    const handler = (handlers[id] = repo.find<T>(id))
    handler.value().then((doc) => {
      setDocuments((docs) => ({
        ...docs,
        [id]: doc,
      }))
    })

    // TODO: evt.handle.doc isn't awesome
    handler.on("change", (evt) => {
      setDocuments((docs) => ({
        ...docs,
        [id]: evt.handle.doc,
      }))
    })
  })

  prevHandlerIds.forEach((id) => {
    if (handlers[id]) {
      return
    }

    const handler = handlers[id]
    handler.off("change")
    delete handlers[id]

    setDocuments((textDocs) => {
      const copy = { ...textDocs }
      delete copy[id]
      return copy
    })
  })

  return documents
}

export function useDocuments<T>(urls?: PushpinUrl[]): DocMap<T> {
  const handlersRef = useRef<DocMap<DocHandle<T>>>({})
  const repo = useRepo()
  const [documents, setDocuments] = useState<DocMap<T>>({})

  if (!urls) {
    return documents
  }

  const handlers = handlersRef.current
  const prevHandlerIds = Object.keys(handlers) as PushpinUrl[]

  urls.forEach((url) => {
    if (handlers[url]) {
      return
    }

    const id = parseDocumentLink(url).documentId
    const handler = (handlers[url] = repo.find<T>(id))
    handler.value().then((doc) => {
      setDocuments((docs) => ({
        ...docs,
        [url]: doc,
      }))
    })

    // TODO: evt.handle.doc isn't awesome
    handler.on("change", (evt) => {
      setDocuments((docs) => ({
        ...docs,
        [url]: evt.handle.doc,
      }))
    })
  })

  prevHandlerIds.forEach((url) => {
    if (handlers[url]) {
      return
    }

    const handler = handlers[url]
    handler.off("change")
    delete handlers[url]

    setDocuments((textDocs) => {
      const copy = { ...textDocs }
      delete copy[url]
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

export function useMessaging<M>(
  documentId: DocumentId | undefined,
  onMsg: (msg: M) => void
): (msg: M) => void {
  const [send, setSend] = useState<(msg: M) => void>(() => {})

  // Without this ref, we'd close over the `onMsg` passed during the very first render.
  // Instead, we close over the ref object and can be sure we're always reading
  // the latest onMsg callback.
  const onMsgRef = useRef(onMsg)
  onMsgRef.current = onMsg

  // TODO: need a use-effect to handle the unsubscribe here...
  if (!documentId) {
    throw new Error("gotta have a docid pal")
  }

  const handle = useHandle(documentId)
  handle.on("message", ({ message }) => onMsgRef.current(message))
  setSend((message: M) => handle.sendMessage(message))

  return send
}

/*
export function useHyperfile(
  url: HyperfileUrl | null
): [Header, Readable] | [null, null] {
  const [header, setHeader] = useState<[Header, Readable] | [null, null]>([
    null,
    null,
  ]);

  useEffect(() => {
    header && setHeader([null, null]);
    url &&
      Hyperfile.fetch(url).then(([header, readable]) =>
        setHeader([header, readable])
      );
  }, [url]);

  return header;
}

export function useHyperfileHeader(url: HyperfileUrl | null): Header | null {
  const [header, setHeader] = useState<Header | null>(null);
  const { files } = useRepo();

  useEffect(() => {
    header && setHeader(null);
    url && files.header(url).then(setHeader);
  }, [url]);

  return header;
}
*/

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
