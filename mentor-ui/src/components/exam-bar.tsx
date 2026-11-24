import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TOPICS } from '@/lib/guide'

export function ExamBar({ state }: { state: { covered: Set<string>; last: { number: number; total: number; topic: string; kind: string } } }) {
  const { last, covered } = state
  const pct = Math.min(100, Math.round((last.number / Math.max(last.total, 1)) * 100))
  return (
    <div className="border-b px-4 py-3">
      <div className="mx-auto max-w-3xl">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="font-medium">
            Diagnostic exam · Question {last.number} of ~{last.total}
          </span>
          <span className="text-muted-foreground">{last.kind.replace('-', ' ')}</span>
        </div>
        <div className="bg-muted mb-3 h-1.5 overflow-hidden rounded-full">
          <div className="bg-primary h-full transition-all" style={{ width: pct + '%' }} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {TOPICS.map((t) => {
            const done = covered.has(t.key)
            return (
              <span
                key={t.key}
                className={cn(
                  'flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]',
                  t.key === last.topic && 'border-primary font-medium',
                  done ? 'bg-muted' : 'text-muted-foreground',
                )}
              >
                {done && <Check className="size-3" />}
                {t.label}
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}
