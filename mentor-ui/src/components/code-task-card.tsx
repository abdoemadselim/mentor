import { Code2, Send } from 'lucide-react'
import { useState } from 'react'
import { CodeEditor } from '@/components/code-editor'
import { Markdown } from '@/components/markdown'
import { Button } from '@/components/ui/button'
import { normLang } from '@/lib/run'

export interface CodeTask {
  title: string
  language: string
  starter: string
  instructions: string
}

export function CodeTaskCard({ task, active, onSubmit }: { task: CodeTask; active: boolean; onSubmit: (code: string) => void }) {
  const [code, setCode] = useState(task.starter)
  const lang = normLang(task.language)
  return (
    <div className="not-prose my-3 overflow-hidden rounded-2xl border">
      <div className="bg-muted/60 flex items-center gap-2 px-4 py-2.5 text-sm font-medium">
        <Code2 className="size-4" /> Your turn: {task.title}
        <span className="text-muted-foreground ml-auto text-xs font-normal">{lang}</span>
      </div>
      <div className="px-4 pt-3 pb-3 text-sm"><Markdown>{task.instructions}</Markdown></div>
      <div className="px-3 pb-3">
        <CodeEditor
          value={code}
          onChange={setCode}
          language={lang}
          readOnly={!active}
          actions={
            <Button size="sm" onClick={() => onSubmit('```' + lang + '\n' + code + '\n```')}>
              <Send /> Submit code
            </Button>
          }
        />
      </div>
    </div>
  )
}
