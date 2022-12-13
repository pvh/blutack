import { useEffect } from "react"
import { WorkspaceDoc } from "../content-types/workspace/Workspace"
import { useDocumentIds } from "./Hooks"
import { ContactDoc } from "../content-types/contact"
import { DocumentId } from "automerge-repo"
import { useDocument } from "automerge-repo-react-hooks"

const SEARCHES: { [name: string]: Search } = {}

interface MatchData {
  [name: string]: any
}

export interface Match {
  type: string
  from: number
  to: number
  data: MatchData
  style: TextStyle
}

interface TextStyle {
  color?: string
  isBold?: boolean
  isItalic?: boolean
}

interface Search {
  pattern: RegExp
  style: TextStyle
  data?: (match: string[]) => MatchData
}

export function registerSearch(name: string, search: Search) {
  SEARCHES[name] = search
}

interface AutocompletionSuggestion {
  value: string
}

interface Autocompletion {
  pattern: RegExp
  suggestions: (matches: string[]) => AutocompletionSuggestion[]
}

const AUTOCOMPLETIONS: { [name: string]: Autocompletion } = {}

export function registerAutocompletion(
  name: string,
  autocompletion: Autocompletion
) {
  if (!autocompletion.pattern.toString().endsWith("$/")) {
    console.error(
      "pattern has to match at the end of a string so it needs to end with '$'"
    )
    return
  }

  AUTOCOMPLETIONS[name] = autocompletion
}

export function evalAutocompletion(text: string): {
  suggestions: AutocompletionSuggestion[]
  matchOffset: number
} {
  let matchOffset = 0

  const suggestions = Object.entries(AUTOCOMPLETIONS).flatMap(
    ([name, autocompletion]) => {
      const match = text.match(autocompletion.pattern)

      if (!match) {
        return []
      }

      // todo: doesn't handle case where multiple autocompletions match on different prefix
      matchOffset = -match[0].length

      return autocompletion
        .suggestions(match)
        .filter(({ value }) => value !== match[0])
    }
  )

  return {
    matchOffset,
    suggestions,
  }
}

export function evalAllSearches(text: string): Match[] {
  return Object.keys(SEARCHES).flatMap((name) => evalSearchFor(name, text))
}

export function evalSearchFor(name: string, text: string): Match[] {
  const matches: Match[] = []

  const search = SEARCHES[name]

  if (!search) {
    console.error(`unknown search: ${name}`)
    return []
  }

  const regex = new RegExp(search.pattern, "igm")

  let match, prevIndex

  while ((match = regex.exec(text)) != null) {
    const value = match[0]
    const from = match.index
    const to = from + value.length

    if (from === prevIndex) {
      throw new Error(
        "regex causes infinite loop because it matches empty string"
      )
    }

    prevIndex = from

    matches.push({
      type: name,
      from,
      to,
      style: search.style,
      data: search.data ? search.data(match) : match,
    })
  }

  return matches
}

// search definitions

export const MENTION = "mention"

registerSearch(MENTION, {
  pattern: /@([a-zA-Z]+)/,
  style: {
    color: "#999",
    isBold: true,
  },
  data: ([, name]) => {
    return { name }
  },
})

export const HEADLINE = "headline"

registerSearch(HEADLINE, {
  pattern: /^#{1,5}.*$/,
  style: {
    isBold: true,
  },
})

export const SOC = "soc"

registerAutocompletion(SOC, {
  pattern: /([0-9]{1,2}):([0-9]{2})$/,
  suggestions: ([, hours, minutes]: string[]) => {
    const soc = (parseInt(hours, 10) - 18) % 24
    const fraction = parseInt(minutes) / 60

    return [
      {
        value:
          `SOC ${soc}` + (fraction === 0 ? "" : fraction.toString().slice(1)),
      },
    ]
  },
})

export function useMentionAutocompletion(workspaceId: DocumentId) {
  const [workspace] = useDocument<WorkspaceDoc>(workspaceId)
  const contacts = useDocumentIds<ContactDoc>(
    workspace && workspace.contactIds ? workspace.contactIds : []
  )

  useEffect(() => {
    console.log("register mention search")

    registerAutocompletion(MENTION, {
      pattern: /@([a-zA-Z])*$/,
      suggestions: ([search]: string[]) => {
        const names = new Set<string>()

        for (const contact of Object.values(contacts)) {
          names.add(`@${contact.name.toLowerCase()}`)
        }

        return Array.from(names)
          .filter((name) => name.startsWith(search))
          .map((name) => ({
            value: name,
          }))
      },
    })
  }, [contacts])
}
