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
