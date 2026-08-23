import ReactMarkdown from 'react-markdown'
import remarkBreaks from 'remark-breaks'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import HorseLink from './HorseLink'

/** JSON の details など、馬解説の Markdown。太字は馬名リンクとして扱う */
export default function HorseMarkdown({ markdown }: { markdown: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkBreaks, remarkGfm]}
      rehypePlugins={[rehypeRaw]}
      components={{
        p: ({ children }) => (
          <p className="indent-4" style={{ marginBottom: '1em' }}>
            {children}
          </p>
        ),
        strong: ({ ...props }) => {
          if (typeof props.children === 'string' && props.children.length > 0) {
            return <HorseLink name={props.children} />
          }
          return <strong {...props} />
        },
      }}
    >
      {markdown}
    </ReactMarkdown>
  )
}
