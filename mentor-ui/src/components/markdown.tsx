import { Check, Copy } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import remarkGfm from 'remark-gfm'
import 'highlight.js/styles/github-dark.css'

function textOf(node: ReactNode): string {
  if (typeof node === 'string') return node
  if (Array.isArray(node)) return node.map(textOf).join('')
  if (node && typeof node === 'object' && 'props' in node)
    return textOf((node as { props: { children?: ReactNode } }).props.children)
  return ''
}

function CodeBlock({ children }: { children?: ReactNode }) {
  const [copied, setCopied] = useState(false)
  const el = children as { props?: { className?: string } }
  const lang = /language-(\w+)/.exec(el?.props?.className ?? '')?.[1] ?? 'code'
  return (
    <div className="not-prose my-4 overflow-hidden rounded-xl bg-[#0d1117] text-sm">
      <div className="flex items-center justify-between bg-white/10 px-4 py-2 text-xs text-zinc-300">
        <span>{lang}</span>
        <button
          className="flex items-center gap-1.5 hover:text-white"
          onClick={() => {
            void navigator.clipboard.writeText(textOf(children))
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
          }}
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? 'Copied' : 'Copy code'}
        </button>
      </div>
      <pre className="overflow-x-auto p-4">{children}</pre>
    </div>
  )
}

export function Markdown({ children, components }: { children: string; components?: Components }) {
  return (
    <div className="md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{ pre: CodeBlock, ...components }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
