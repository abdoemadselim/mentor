import { Check, Copy, FileText, FolderOpen, GraduationCap, RefreshCw, Save } from 'lucide-react'
import { useState } from 'react'
import { Markdown } from '@/components/markdown'
import { Button } from '@/components/ui/button'
import { CodeTaskCard, type CodeTask } from '@/components/code-task-card'
import type { Msg } from '@/lib/chat'
import { toolName } from '@/lib/guide'

const base = (p: unknown) => String(p ?? '').split('/').slice(-2).join('/')
const TOOL_LABEL: Record<string, (i: Record<string, unknown>) => { icon: typeof FileText; text: string }> = {
  Read: (i) => ({ icon: FileText, text: `Read ${base(i.file_path)}` }),
  Glob: (i) => ({ icon: FolderOpen, text: `Browsed ${i.pattern}` }),
  Write: (i) => ({ icon: Save, text: `Wrote ${base(i.file_path)}` }),
  Edit: (i) => ({ icon: Save, text: `Edited ${base(i.file_path)}` }),
}

export function ChatMessage({
  msg,
  isLast,
  streaming,
  onRegenerate,
  onSend,
}: {
  msg: Msg
  isLast: boolean
  streaming: boolean
  onRegenerate: () => void
  onSend: (t: string) => void
}) {
  const [copied, setCopied] = useState(false)

  if (msg.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="bg-muted max-w-[80%] whitespace-pre-wrap rounded-3xl px-5 py-2.5">{msg.content}</div>
      </div>
    )
  }

  const working = isLast && streaming
  return (
    <div className="flex gap-4">
      <div className="bg-primary text-primary-foreground mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full">
        <GraduationCap className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        {msg.tools?.map((t, i) => {
          if (toolName(t.name) === 'set_phase' || toolName(t.name) === 'exam_question') return null
          if (toolName(t.name) === 'code_task') return null
          const { icon: Icon, text } = (TOOL_LABEL[t.name] ?? (() => ({ icon: FileText, text: t.name })))(t.input)
          return (
            <div key={i} className="text-muted-foreground bg-muted/60 mb-2 mr-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs">
              <Icon className="size-3.5" /> {text}
            </div>
          )
        })}
        {msg.content ? <Markdown>{msg.content}</Markdown> : working && !msg.tools?.length && <span className="cursor" />}
        {working && msg.content && <span className="cursor" />}
        {msg.tools
          ?.filter((t) => toolName(t.name) === 'code_task')
          .map((t, i) => (
            <CodeTaskCard key={i} task={t.input as unknown as CodeTask} active={isLast && !streaming} onSubmit={onSend} />
          ))}
        {msg.error && (
          <p className="text-destructive mt-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm">
            {msg.error}
          </p>
        )}
        {!working && msg.content && (
          <div className="mt-2 -ml-2 flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground size-8"
              onClick={() => {
                void navigator.clipboard.writeText(msg.content)
                setCopied(true)
                setTimeout(() => setCopied(false), 1500)
              }}
            >
              {copied ? <Check /> : <Copy />}
            </Button>
          </div>
        )}
        {!working && !msg.content && msg.error && isLast && (
          <Button variant="outline" size="sm" className="mt-2" onClick={onRegenerate}>
            <RefreshCw /> Retry
          </Button>
        )}
      </div>
    </div>
  )
}
