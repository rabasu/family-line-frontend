import type { ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkBreaks from 'remark-breaks'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import HorseLink from './HorseLink'

function horseNameFromChildren(children: ReactNode): string | null {
  if (typeof children === 'string' && children.length > 0) return children
  if (Array.isArray(children) && children.length > 0 && children.every((child) => typeof child === 'string')) {
    const joined = children.join('')
    return joined.length > 0 ? joined : null
  }
  return null
}

/** JSON の details や牝系解説の Markdown。太字は馬名リンクとして扱う */
export default function HorseMarkdown({ markdown }: { markdown: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkBreaks, remarkGfm]}
      rehypePlugins={[rehypeRaw]}
      components={{
        h2: ({ children }) => <h3 className="mb-3 mt-6 text-lg font-bold text-stone-900 dark:text-gray-100">{children}</h3>,
        h3: ({ children }) => <h4 className="mb-2 mt-4 text-base font-bold text-stone-900 dark:text-gray-100">{children}</h4>,
        p: ({ children }) => (
          <p className="indent-4" style={{ marginBottom: '1em' }}>
            {children}
          </p>
        ),
        strong: ({ children, ...props }) => {
          const name = horseNameFromChildren(children)
          if (name) return <HorseLink name={name} />
          return <strong {...props}>{children}</strong>
        },
      }}
    >
      {markdown}
    </ReactMarkdown>
  )
}
