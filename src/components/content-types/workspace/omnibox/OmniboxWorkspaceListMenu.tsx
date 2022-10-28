import { useEffect, useRef, useState } from "react"
import Debug from "debug"

import {
  createDocumentLink,
  createWebLink,
  parseDocumentLink,
  PushpinUrl,
} from "../../../pushpin-code/ShareLink"

// import InvitationsView from '../../../../InvitationsView'
import { ContactDoc } from "../../contact"
import Badge from "../../../ui/Badge"
import "./Omnibox.css"
import InvitationListItem from "./InvitationListItem"
import ListMenuSection from "../../../ui/ListMenuSection"
import ListMenuItem from "../../../ui/ListMenuItem"
import ListMenu from "../../../ui/ListMenu"
import { WorkspaceDoc as WorkspaceDoc } from "../Workspace"

import "./OmniboxWorkspaceListMenu.css"
import ActionListItem from "./ActionListItem"
import Heading from "../../../ui/Heading"
import { DocCollection, DocumentId } from "automerge-repo"
import { Doc } from "@automerge/automerge"
import { useDocument, useRepo } from "automerge-repo-react-hooks"
import { useDocumentIds, useDocuments } from "../../../pushpin-code/Hooks"
import Content from "../../../Content"

const log = Debug("pushpin:omnibox")

export interface Props {
  active: boolean
  search: string
  documentId: DocumentId
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

export default function OmniboxWorkspaceListMenu(props: Props): Element | null {
  const omniboxInput = useRef<HTMLInputElement>()
  const [workspace, changeWorkspace] = useDocument<WorkspaceDoc>(
    props.documentId
  )
  const repo = useRepo()

  const [selectedIndex, setSelectedIndex] = useState(0)
  const [invitations, setInvitations] = useState([])

  const viewedDocs = useDocuments<TitledDoc>(workspace?.viewedDocUrls)
  const contacts = useDocumentIds(workspace?.contactIds)

  const handleCommandKeys = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      moveDown()
    }

    if (e.key === "ArrowUp") {
      e.preventDefault()
      moveUp()
    }

    const { items } = menuSections()

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
  }

  useEffect(() => {
    if (props.active) {
      document.addEventListener("keydown", handleCommandKeys)
    } else {
      document.removeEventListener("keydown", handleCommandKeys)
    }
    return () => {
      document.removeEventListener("keydown", handleCommandKeys)
    }
  }, [props.active])

  if (!workspace) {
    return null
  }

  const {
    viewedDocUrls = [],
    contactIds = [],
    archivedDocUrls = [],
  } = workspace

  const endSession = () => {
    props.omniboxFinished()
  }

  const moveUp = () => {
    if (selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1)
    }
  }

  const moveDown = () => {
    const { items } = menuSections()
    if (selectedIndex < items.length - 1) {
      setSelectedIndex(selectedIndex + 1)
    }
  }

  const menuSections = (): { items: Item[]; sectionIndices: SectionIndex } => {
    if (!workspace) {
      return { items: [], sectionIndices: {} }
    }

    let items: Item[] = []
    const sectionIndices: { [section: string]: SectionRange } = {}
    const { search } = props

    let searchRegEx: RegExp | null
    // if we have an invalid regex, shortcircuit out of here
    try {
      searchRegEx = new RegExp(search, "i")
    } catch (e) {
      items.push({ type: "nothingFound", actions: [] })
      sectionIndices.nothingFound = { start: 0, end: 1 }
      return { items, sectionIndices }
    }

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
  }

  const sectionItems = (name: string) => {
    const { items, sectionIndices } = menuSections()
    const sectionRange = sectionIndices[name]

    if (sectionRange) {
      console.log("ITEMS:", items.slice(sectionRange.start, sectionRange.end))
      return items.slice(sectionRange.start, sectionRange.end)
    }

    return []
  }

  /* begin actions */
  const view: MenuAction = {
    name: "view",
    faIcon: "fa-compass",
    label: "View",
    shortcut: "⏎",
    keysForActionPressed: (e) => !e.shiftKey && e.key === "Enter",
    callback: (url) => () => navigate(url),
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
    keysForActionPressed: (e) =>
      (e.metaKey || e.ctrlKey) && e.key === "Backspace",
    callback: (url) => () => archiveDocument(url),
  }

  const unarchive: MenuAction = {
    name: "unarchive",
    faIcon: "fa-trash-restore",
    label: "Unarchive",
    shortcut: "⌘+⌫",
    keysForActionPressed: (e) =>
      (e.metaKey || e.ctrlKey) && e.key === "Backspace",
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

  /* end actions */

  /* sections begin */
  const sectionDefinitions: Section[] = [
    {
      name: "viewedDocUrls",
      label: "Documents",
      actions: [view, place, archive],
      items: (props) =>
        Object.entries(viewedDocs)
          .filter(([url, _doc]) => !archivedDocUrls.includes(url as PushpinUrl))
          .filter(
            ([_url, doc]) =>
              doc &&
              ((doc.title && doc.title.match(new RegExp(props.search, "i"))) ||
                (doc.text &&
                  doc.text.join("").match(new RegExp(props.search, "i"))))
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
      actions: [view, unarchive],
      items: (props) =>
        props.search === "" || !workspace
          ? [] // don't show archived URLs unless there's a current search term
          : (workspace.archivedDocUrls || [])
              .map((url): [PushpinUrl, Doc<any>] => [url, viewedDocs[url]])
              .filter(
                ([_url, doc]) =>
                  doc &&
                  doc.title &&
                  doc.title.match(new RegExp(props.search, "i"))
              )
              .map(([url, doc]) => ({ url })),
    },
    {
      name: "docUrls",
      actions: [view],
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
      actions: [invite, place],
      items: (props) =>
        Object.entries(contacts)
          .filter(([id, doc]) => doc.name)
          .filter(([id, doc]) => doc.name.match(new RegExp(props.search, "i")))
          .map(([id, doc]) => ({
            url: createDocumentLink("contact", id as DocumentId),
          })),
    },
  ]
  /* end sections */

  const navigate = (url: PushpinUrl) => {
    // this weird typecast is to work around a typescript bug,
    // maybe try removing it and see if it's better.
    window.location.href = createWebLink(window.location, url)
    props.omniboxFinished()
  }

  const offerDocumentToIdentity = async (recipientPushpinUrl: PushpinUrl) => {
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
    const { type, documentId: recipientId } =
      parseDocumentLink(recipientPushpinUrl)

    if (!workspace || !workspace.selfId) {
      return
    }

    if (type !== "contact") {
      throw new Error(
        "Offer the current document to a contact by passing in the contact id document."
      )
    }

    const handle = repo.find<ContactDoc>(workspace.selfId)
    handle.change((s: ContactDoc) => {
      if (!s.invites) {
        s.invites = {}
      }

      // XXX right now this code leaks identity documents and document URLs to
      //     every single person who knows you
      // TODO: encrypt identity
      if (!s.invites[recipientId]) {
        s.invites[recipientId] = []
      }

      // TODO: prevent duplicate shares.
      // should be "box" we push
      s.invites[recipientId].push(workspace.currentDocUrl)
    })
  }

  const archiveDocument = (url: PushpinUrl) => {
    changeWorkspace((doc) => {
      if (!doc.archivedDocUrls) {
        doc.archivedDocUrls = []
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
            <Badge
              icon="question-circle"
              backgroundColor="var(--colorPaleGrey)"
            />
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
      const invitation = item.object

      const url = invitation.documentUrl
      const { documentId } = parseDocumentLink(url)

      return (
        <ActionListItem
          key={`${invitation.sender.hypermergeUrl}-${invitation.documentUrl}`}
          contentUrl={url}
          defaultAction={actions[0]}
          actions={actions}
          selected={item.selected}
        >
          <InvitationListItem
            invitation={invitation}
            url={url}
            documentId={documentId}
          />
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
                  <Content context="list" url={url} />
                </ActionListItem>
              )
          )}
        </ListMenuSection>
      ))}
      {renderNothingFound()}
    </ListMenu>
  )
}
