import { ReactElement, useCallback, useEffect, useMemo, useState } from "react"
import Debug from "debug"

import {
  createDocumentLink,
  createWebLink,
  parseDocumentLink,
  PushpinUrl,
} from "../../../../bootstrap/lib/blutack/Url"

import { ContactDoc } from "../../contact"
import Badge from "../../../../bootstrap/lib/ui/Badge"
import "./Omnibox.css"
import InvitationListItem from "./InvitationListItem"
import ListMenuSection from "../../../../bootstrap/lib/ui/ListMenuSection"
import ListMenuItem from "../../../../bootstrap/lib/ui/ListMenuItem"
import ListMenu from "../../../../bootstrap/lib/ui/ListMenu"
import { WorkspaceDoc as WorkspaceDoc } from "../Workspace"

import "./OmniboxWorkspaceListMenu.css"
import ActionListItem from "./ActionListItem"
import Heading from "../../../../bootstrap/lib/ui/Heading"
import { DocumentId } from "automerge-repo"
import { Doc, List } from "@automerge/automerge"
import { useDocument, useRepo } from "automerge-repo-react-hooks"
import { useDocumentIds, useDocuments } from "../../../../bootstrap/lib/blutack/Hooks"
import Content from "../../../../bootstrap/lib/blutack/Content"
import useInvitations, { Invitation } from "./InvitationsHook"
import "./OmniboxWorkspaceListMenu.css"
import { getCurrentDocUrl, openDoc } from "../../../../bootstrap/lib/blutack/Url"
import ListItem from "../../../../bootstrap/lib/ui/ListItem"

const log = Debug("pushpin:omnibox")

export interface Props {
  active: boolean
  search: string
  workspaceDocId: DocumentId
  omniboxFinished: Function
  onContent: (url: PushpinUrl) => boolean
}

interface MenuAction {
  name: string
  faIcon: string
  label: string
  shortcut: string
  destructive?: boolean
  keysForActionPressed: (e: KeyboardEvent) => boolean
  callback: (url: PushpinUrl) => () => void
}

interface SectionIndex {
  [sectionName: string]: SectionRange
}

interface SectionRange {
  start: number
  end: number
}

interface Section {
  name: string
  label?: string
  actions: Action[]
  items: (props: Props) => Item[]
}

export interface Item {
  type?: string
  object?: any
  url?: PushpinUrl
  selected?: boolean
  actions?: Action[]
}

export interface Action {
  name: string
  callback: (url: any) => () => void
  faIcon: string
  label: string
  shortcut: string
  keysForActionPressed: (e: any) => boolean
}

// TODO: this is to help with the search engine
interface TitledDoc {
  title: string
}

export default function OmniboxWorkspaceListMenu(props: Props): ReactElement | null {
  const [workspace, changeWorkspace] = useDocument<WorkspaceDoc>(props.workspaceDocId)
  const repo = useRepo()

  const [selectedIndex, setSelectedIndex] = useState(0)

  const invitations = useInvitations(props.workspaceDocId)

  const viewedDocs = useDocuments<TitledDoc>(workspace?.viewedDocUrls)
  const contacts = useDocumentIds(workspace?.contactIds)

  /* begin actions */
  const view: MenuAction = {
    name: "view",
    faIcon: "fa-compass",
    label: "View",
    shortcut: "⏎",
    keysForActionPressed: (e) => !e.shiftKey && e.key === "Enter",
    callback: (url) => () => {
      navigate(url)
    },
  }

  const invite: MenuAction = {
    name: "invite",
    faIcon: "fa-share-alt",
    label: "Invite",
    shortcut: "⏎",
    keysForActionPressed: (e) => !e.shiftKey && e.key === "Enter",
    callback: (url) => () => offerDocumentToIdentity(url),
  }

  const archive: MenuAction = {
    name: "archive",
    destructive: true,
    faIcon: "fa-trash",
    label: "Archive",
    shortcut: "⌘+⌫",
    keysForActionPressed: (e) => (e.metaKey || e.ctrlKey) && e.key === "Backspace",
    callback: (url) => () => archiveDocument(url),
  }

  const unarchive: MenuAction = {
    name: "unarchive",
    faIcon: "fa-trash-restore",
    label: "Unarchive",
    shortcut: "⌘+⌫",
    keysForActionPressed: (e) => (e.metaKey || e.ctrlKey) && e.key === "Backspace",
    callback: (url) => () => unarchiveDocument(url),
  }

  const place: MenuAction = {
    name: "place",
    faIcon: "fa-download",
    label: "Place",
    shortcut: "⇧+⏎",
    keysForActionPressed: (e) => e.shiftKey && e.key === "Enter",
    callback: (url) => () => {
      props.onContent(url)
    },
  }

  const debug: MenuAction = {
    name: "debug",
    faIcon: "fa-bug",
    label: "Debug",
    shortcut: "⌘+d",
    keysForActionPressed: (e) => (e.metaKey || e.ctrlKey) && e.key === "d",
    callback: (url) => () => {
      navigate(createDocumentLink("raw", parseDocumentLink(url).documentId))
    },
  }

  /* end actions */

  const sectionDefinitions: Section[] = useMemo(() => {
    if (!workspace) {
      return []
    }

    return [
      {
        name: "viewedDocUrls",
        label: "Documents",
        actions: [view, place, debug, archive],
        items: (props) =>
          Object.entries(viewedDocs)
            .filter(
              ([url, _doc]) =>
                !workspace?.archivedDocUrls ||
                !workspace?.archivedDocUrls.includes(url as PushpinUrl)
            )
            .filter(
              ([_url, doc]) =>
                doc &&
                ((doc.title && doc.title.match(new RegExp(props.search, "i"))) ||
                  (doc.text && doc.text.join("").match(new RegExp(props.search, "i"))))
            )
            .reduce(
              (prev, current) => {
                if (current[0].match("board|contentlist|pdf")) {
                  prev[0].push(current)
                } else {
                  prev[1].push(current)
                }
                return prev
              },
              [[], []] as [any[], any[]]
            )
            .flat()
            .map(([url, _doc]) => ({ url: url as PushpinUrl })),
      },
      {
        name: "archivedDocUrls",
        label: "Archived",
        actions: [debug, view, unarchive],
        items: (props) =>
          props.search === "" || !workspace
            ? [] // don't show archived URLs unless there's a current search term
            : (workspace.archivedDocUrls || [])
                .map((url): [PushpinUrl, Doc<any>] => [url, viewedDocs[url]])
                .filter(
                  ([_url, doc]) =>
                    doc && doc.title && doc.title.match(new RegExp(props.search, "i"))
                )
                .map(([url, doc]) => ({ url })),
      },
      {
        name: "docUrls",
        actions: [debug, view],
        items: (props) => {
          // try parsing the "search" to see if it is a valid document URL
          try {
            parseDocumentLink(props.search)
            return [{ url: props.search as PushpinUrl }]
          } catch {
            return []
          }
        },
      },
      {
        name: "contacts",
        label: "Contacts",
        actions: [debug, invite, place],
        items: (props) =>
          Object.entries(contacts)
            .filter(([id, doc]) => doc.name)
            .filter(([id, doc]) => doc.name.match(new RegExp(props.search, "i")))
            .map(([id, doc]) => ({
              url: createDocumentLink("contact", id as DocumentId),
            })),
      },
    ]
  }, [workspace, props.search, viewedDocs])

  const menuSections = useMemo((): {
    items: Item[]
    sectionIndices: SectionIndex
  } => {
    if (!workspace) {
      return { items: [], sectionIndices: {} }
    }

    let items: Item[] = []
    const sectionIndices: { [section: string]: SectionRange } = {}
    const { search } = props

    // if we have an invalid regex, shortcircuit out of here
    let searchRegEx: RegExp
    try {
      searchRegEx = new RegExp(search, "i")
    } catch (e) {
      items.push({ type: "nothingFound", actions: [] })
      sectionIndices.nothingFound = { start: 0, end: 1 }
      return { items, sectionIndices }
    }

    // invitations are sort of a pseudo-section right now with lots of weird behaviour
    const invitationItems = (invitations || [])
      .filter((i) => !workspace.viewedDocUrls.some((url) => url === i.docUrl))
      .filter((invitation) =>
        ((invitation.doc as TitledDoc).title || "Loading...").match(searchRegEx)
      )
      .map((invitation) => ({
        type: "invitation",
        object: invitation,
        url: invitation.docUrl,
        actions: [view],
      }))

    sectionIndices.invitations = {
      start: items.length,
      end: invitationItems.length,
    }
    items = items.concat(invitationItems)

    // add each section definition's items to the output
    sectionDefinitions.forEach((sectionDefinition) => {
      // this is really, really not my favorite thing
      const sectionItems = sectionDefinition.items!(props)
      // don't tell my mom about this next line
      sectionItems.forEach((item) => {
        item.actions = sectionDefinition.actions
      })
      if (sectionItems.length > 0) {
        sectionIndices[sectionDefinition.name] = {
          start: items.length,
          end: items.length + sectionItems.length,
        }
        items = items.concat(sectionItems)
      }
    })

    // if after putting all the sections together, we still don't have anything,
    // just put in an "empty results" pseudosection
    // we could, uh, do better here too
    if (items.length === 0) {
      items.push({ type: "nothingFound", actions: [] })
      sectionIndices.nothingFound = { start: 0, end: 1 }
    }

    if (items[selectedIndex]) {
      items[selectedIndex].selected = true
    }

    return { items, sectionIndices }
  }, [props.search, sectionDefinitions, workspace])

  const moveUp = (selectedIndex: number) => {
    if (selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1)
    }
  }

  const moveDown = useCallback(
    (selectedIndex: number) => {
      const { items } = menuSections

      if (selectedIndex < items.length - 1) {
        setSelectedIndex(selectedIndex + 1)
      }
    },
    [menuSections]
  )

  const handleCommandKeys = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        moveDown(selectedIndex)
      }

      if (e.key === "ArrowUp") {
        e.preventDefault()
        moveUp(selectedIndex)
      }

      const { items } = menuSections

      const selected = items[selectedIndex]
      if (!selected) {
        return null
      }

      // see if any of the actions for the currently selected item are triggered by the keypress
      // XXX: we might want to use the mousetrap library for this
      if (selected.actions) {
        selected.actions.forEach((action) => {
          if (action.keysForActionPressed(e)) {
            action.callback(selected.url)()
            endSession()
          }
        })
      }
    },
    [moveDown, moveUp, menuSections]
  )

  useEffect(() => {
    if (props.active) {
      document.addEventListener("keydown", handleCommandKeys)
    } else {
      document.removeEventListener("keydown", handleCommandKeys)
    }
    return () => {
      document.removeEventListener("keydown", handleCommandKeys)
    }
  }, [handleCommandKeys])

  if (!workspace) {
    return null
  }

  const { archivedDocUrls = [] } = workspace

  const endSession = () => {
    setSelectedIndex(0)
    props.omniboxFinished()
  }

  const sectionItems = (name: string) => {
    const { items, sectionIndices } = menuSections
    const sectionRange = sectionIndices[name]

    if (sectionRange) {
      return items.slice(sectionRange.start, sectionRange.end)
    }

    return []
  }

  const navigate = (url: PushpinUrl) => {
    openDoc(url)
    props.omniboxFinished()
  }

  const offerDocumentToIdentity = async (recipientPushpinUrl: PushpinUrl) => {
    const currentDocUrl = getCurrentDocUrl()

    if (!currentDocUrl) {
      return
    }

    if (
      // eslint-disable-next-line
      !window.confirm(
        "Are you sure you want to share the currently viewed document " +
          "(and all its linked documents) with this user?"
      )
    ) {
      return
    }

    // XXX out of scope RN but consider if we should change the key for consistency?
    const { type, documentId: recipientId } = parseDocumentLink(recipientPushpinUrl)

    if (!workspace || !workspace.selfId) {
      return
    }

    if (type !== "contact") {
      throw new Error(
        "Offer the current document to a contact by passing in the contact id document."
      )
    }

    const handle = repo.find<ContactDoc>(workspace.selfId)
    handle.change((s) => {
      if (!s.invites) {
        s.invites = {}
      }

      // XXX right now this code leaks identity documents and document URLs to
      //     every single person who knows you
      // TODO: encrypt identity
      if (!s.invites[recipientId]) {
        s.invites[recipientId] = [] as unknown as List<PushpinUrl>
      }

      // TODO: prevent duplicate shares.
      // should be "box" we push
      s.invites[recipientId].push(currentDocUrl)
    })
  }

  const archiveDocument = (url: PushpinUrl) => {
    changeWorkspace((doc) => {
      if (!doc.archivedDocUrls) {
        doc.archivedDocUrls = [] as unknown as List<PushpinUrl>
      }

      if (!doc.archivedDocUrls.includes(url)) {
        doc.archivedDocUrls.push(url)
      }
    })
  }

  const unarchiveDocument = (url: PushpinUrl) => {
    changeWorkspace((doc) => {
      if (!doc.archivedDocUrls) {
        return
      }
      const unarchiveIndex = doc.archivedDocUrls.findIndex((i) => i === url)
      if (unarchiveIndex >= 0) {
        delete doc.archivedDocUrls[unarchiveIndex]
      }
    })
  }

  const renderNothingFound = () => {
    const item = sectionItems("nothingFound")[0]

    if (item) {
      return (
        <ListMenuSection title="Oops..." key="nothingFound">
          <ListMenuItem>
            <Badge icon="question-circle" backgroundColor="var(--colorPaleGrey)" />
            <Heading>Nothing Found</Heading>
          </ListMenuItem>
        </ListMenuSection>
      )
    }
    return null
  }

  const renderInvitationsSection = () => {
    const actions = [view, place, archive]

    const invitations = sectionItems("invitations").map((item) => {
      const invitation = item.object as Invitation

      const url = invitation.docUrl
      const { documentId } = parseDocumentLink(url)

      return (
        <ActionListItem
          key={`${invitation.senderId}-${invitation.docUrl}`}
          contentUrl={url}
          defaultAction={actions[0]}
          actions={actions}
          selected={item.selected}
        >
          <InvitationListItem invitation={invitation} url={url} documentId={documentId} />
        </ActionListItem>
      )
    })

    if (invitations.length > 0) {
      return (
        <ListMenuSection title="Invitations" key="invitations">
          {invitations}
        </ListMenuSection>
      )
    }

    return null
  }

  if (!workspace) {
    return null
  }

  // fold in the section items and filter out empty sections
  const sections = sectionDefinitions
    .map((sD) => ({
      ...sD,
      items: sectionItems(sD.name),
    }))
    .filter((s) => s.items.length > 0)

  return (
    <ListMenu>
      {renderInvitationsSection()}
      {sections.map(({ name, label, items, actions }) => (
        <ListMenuSection key={name} title={label}>
          {items.map(
            ({ url, selected }) =>
              url && (
                <ActionListItem
                  key={url}
                  contentUrl={url}
                  defaultAction={actions[0]}
                  actions={actions}
                  selected={selected}
                >
                  <ListItem>
                    <Content context="badge" url={url} />
                    <Content context="title" url={url} />
                  </ListItem>
                </ActionListItem>
              )
          )}
        </ListMenuSection>
      ))}
      {renderNothingFound()}
    </ListMenu>
  )
}
