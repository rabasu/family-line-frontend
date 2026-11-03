import type { ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkBreaks from 'remark-breaks'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import HorseLink from './HorseLink'

/** react-markdown の URL 許可リストに通る相対パス。DOM には出さず HorseLink に渡す */
const HORSE_HREF_PREFIX = '/__horse__/'

type MdNode = {
  type?: string
  value?: string
  url?: string
  children?: MdNode[]
}

const WIKI_LINK = /\[\[([^\]\n]+)\]\]/g

function splitWikiText(value: string): MdNode[] {
  const nodes: MdNode[] = []
  let last = 0
  for (const match of value.matchAll(WIKI_LINK)) {
    const index = match.index ?? 0
    if (index > last) nodes.push({ type: 'text', value: value.slice(last, index) })
    const name = match[1].trim()
    if (name) {
      nodes.push({
        type: 'link',
        url: `${HORSE_HREF_PREFIX}${encodeURIComponent(name)}`,
        children: [{ type: 'text', value: name }],
      })
    } else {
      nodes.push({ type: 'text', value: match[0] })
    }
    last = index + match[0].length
  }
  if (last === 0) return [{ type: 'text', value }]
  if (last < value.length) nodes.push({ type: 'text', value: value.slice(last) })
  return nodes
}

/** [[馬名]] をリンクノードにする。コード内は触らない */
function remarkHorseWiki() {
  return (tree: MdNode) => {
    const walk = (node: MdNode) => {
      if (node.type === 'code' || node.type === 'inlineCode' || node.type === 'link') return
      if (!node.children) return
      const next: MdNode[] = []
      for (const child of node.children) {
        if (child.type === 'text' && typeof child.value === 'string' && child.value.includes('[[')) {
          next.push(...splitWikiText(child.value))
        } else {
          walk(child)
          next.push(child)
        }
      }
      node.children = next
    }
    walk(tree)
  }
}

function horseHrefName(href: string | undefined): string | null {
  if (!href?.startsWith(HORSE_HREF_PREFIX)) return null
  try {
    const name = decodeURIComponent(href.slice(HORSE_HREF_PREFIX.length)).trim()
    return name || null
  } catch {
    return null
  }
}

/** JSON の details や牝系・馬記事の Markdown。[[馬名]] を馬リンクにする */
export default function HorseMarkdown({ markdown }: { markdown: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkHorseWiki, remarkBreaks, remarkGfm]}
      rehypePlugins={[rehypeRaw]}
      components={{
        h2: ({ children }) => <h3 className="text-heading mb-3 mt-6 text-lg font-bold">{children}</h3>,
        h3: ({ children }) => <h4 className="text-heading mb-2 mt-4 text-base font-bold">{children}</h4>,
        p: ({ children }) => (
          <p className="text-heading indent-4" style={{ marginBottom: '1em' }}>
            {children}
          </p>
        ),
        a: ({ href, children }: { href?: string; children?: ReactNode }) => {
          const name = horseHrefName(href)
          if (name) return <HorseLink name={name} />
          return <a href={href}>{children}</a>
        },
      }}
    >
      {markdown}
    </ReactMarkdown>
  )
}
