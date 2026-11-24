import { javascript } from '@codemirror/lang-javascript'
import { json } from '@codemirror/lang-json'
import { python } from '@codemirror/lang-python'
import { sql } from '@codemirror/lang-sql'
import { githubDark } from '@uiw/codemirror-theme-github'
import CodeMirror from '@uiw/react-codemirror'
import { Loader2, Play } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { normLang, RUNNABLE, type RunResult, runCode } from '@/lib/run'

function extensions(lang: string) {
  switch (normLang(lang)) {
    case 'python': return [python()]
    case 'javascript': return [javascript()]
    case 'typescript': return [javascript({ typescript: true })]
    case 'sql': return [sql()]
    case 'json': return [json()]
    default: return []
  }
}

/** CodeMirror editor + optional Run button with an output panel. */
export function CodeEditor({
  value,
  onChange,
  language,
  readOnly,
  minHeight = '160px',
  actions,
}: {
  value: string
  onChange: (v: string) => void
  language: string
  readOnly?: boolean
  minHeight?: string
  actions?: React.ReactNode
}) {
  const [out, setOut] = useState<RunResult | string | null>(null)
  const [running, setRunning] = useState(false)
  const canRun = RUNNABLE.includes(normLang(language))

  const run = async () => {
    setRunning(true)
    setOut(null)
    try {
      setOut(await runCode(normLang(language), value))
    } catch (e) {
      setOut((e as Error).message)
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-[#0d1117]">
      <CodeMirror
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        editable={!readOnly}
        theme={githubDark}
        extensions={extensions(language)}
        minHeight={minHeight}
        maxHeight="420px"
        basicSetup={{ lineNumbers: true, foldGutter: false, highlightActiveLine: !readOnly }}
        style={{ fontSize: 14 }}
      />
      {(canRun || actions) && !readOnly && (
        <div className="flex items-center justify-end gap-2 border-t border-white/10 px-3 py-2">
          {canRun && (
            <Button size="sm" variant="secondary" onClick={run} disabled={running || !value.trim()}>
              {running ? <Loader2 className="animate-spin" /> : <Play />} Run
            </Button>
          )}
          {actions}
        </div>
      )}
      {out !== null && (
        <pre className="max-h-60 overflow-auto border-t border-white/10 px-4 py-3 font-mono text-xs whitespace-pre-wrap text-zinc-200">
          {typeof out === 'string' ? (
            <span className="text-red-400">{out}</span>
          ) : (
            <>
              {out.stdout}
              {out.stderr && <span className="text-red-400">{out.stderr}</span>}
              <span className="text-zinc-500">
                {'\n'}[exit code {out.exitCode}]
              </span>
            </>
          )}
        </pre>
      )}
    </div>
  )
}
