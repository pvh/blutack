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
