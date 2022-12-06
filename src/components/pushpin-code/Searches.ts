const SEARCHES: { [name: string]: Search } = {}

interface TextStyle {
  color?: string
  isBold?: boolean
  isItalic?: boolean
}

interface Search {
  pattern: RegExp
  style: TextStyle
}

export function registerSearch(name: string, search: Search) {
  SEARCHES[name] = search
}

interface Autocompletion {
  pattern: RegExp
  suggestions: (matches: string[]) => string[]
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
  suggestions: string[]
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

      return autocompletion.suggestions(match)
    }
  )

  return {
    matchOffset,
    suggestions,
  }
}

interface Formatting {
  from: number
  to: number
  style: TextStyle
}

export function evalSearch(text: string): Formatting[] {
  const matches: Formatting[] = []

  Object.entries(SEARCHES).forEach(([name, search]) => {
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

      matches.push({ from, to, style: search.style })
    }
  })

  return matches
}
