import { ArrowUp, Code2, Square } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { CodeEditor } from '@/components/code-editor'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const LANGS = ['python', 'javascript', 'typescript', 'sql', 'json']

export function Composer({
  streaming,
  onSend,
  onStop,
}: {
  streaming: boolean
  onSend: (t: string) => void
  onStop: () => void
}) {
  const [value, setValue] = useState('')
  const [codeMode, setCodeMode] = useState(false)
  const [lang, setLang] = useState('python')
  const [code, setCode] = useState('')
  const [note, setNote] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 200) + 'px'
  }, [value, codeMode])

  const submit = () => {
    if (streaming) return
    if (codeMode) {
      if (!code.trim()) return
      onSend((note.trim() ? note.trim() + '\n\n' : '') + '```' + lang + '\n' + code + '\n```')
      setCode('')
      setNote('')
      return
    }
    const t = value.trim()
    if (!t) return
    onSend(t)
    setValue('')
  }

  const canSend = codeMode ? !!code.trim() : !!value.trim()

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-4">
      <div className="bg-muted/50 dark:bg-muted/40 rounded-[1.75rem] border p-2 shadow-sm">
        {codeMode && (
          <div className="space-y-2 p-2 pb-1">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional note about your code"
              className="placeholder:text-muted-foreground w-full bg-transparent px-1 text-sm outline-none"
            />
            <CodeEditor value={code} onChange={setCode} language={lang} minHeight="140px" />
          </div>
        )}
        <div className="flex items-end gap-2 pl-3">
          <Button
            variant={codeMode ? 'secondary' : 'ghost'}
            size="icon"
            className="mb-0.5 size-9 shrink-0 rounded-full"
            aria-label="Toggle code mode"
            title="Write code"
            onClick={() => setCodeMode((c) => !c)}
          >
            <Code2 />
          </Button>
          {codeMode ? (
            <div className="flex flex-1 items-center gap-1 py-2">
              {LANGS.map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={cn('rounded-full px-2.5 py-1 text-xs', l === lang ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}
                >
                  {l}
                </button>
              ))}
            </div>
          ) : (
            <textarea
              ref={ref}
              rows={1}
              autoFocus
              value={value}
              placeholder="Message your mentor"
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault()
                  submit()
                }
              }}
              className="placeholder:text-muted-foreground max-h-52 flex-1 resize-none bg-transparent py-2 outline-none"
            />
          )}
          {streaming ? (
            <Button size="icon" className="size-9 rounded-full" onClick={onStop} aria-label="Stop">
              <Square className="fill-current" />
            </Button>
          ) : (
            <Button size="icon" className="size-9 rounded-full" disabled={!canSend} onClick={submit} aria-label="Send">
              <ArrowUp />
            </Button>
          )}
        </div>
      </div>
      <p className="text-muted-foreground mt-2 text-center text-xs">
        {codeMode ? 'Code mode: Run executes Python/TypeScript/JavaScript locally (10 s limit).' : 'The mentor can make mistakes. Verify important details.'}
      </p>
    </div>
  )
}
