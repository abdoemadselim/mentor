import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PHASES, type PhaseKey } from '@/lib/guide'

export function PhaseStepper({ phase, note }: { phase: PhaseKey; note?: string }) {
  const idx = PHASES.findIndex((p) => p.key === phase)
  return (
    <div className="flex min-w-0 items-center gap-3" title={note || PHASES[idx].hint}>
      <ol className="flex items-center gap-1 text-xs">
        {PHASES.map((p, i) => (
          <li key={p.key} className="flex items-center gap-1">
            <span
              className={cn(
                'flex items-center gap-1 rounded-full px-2.5 py-1',
                i === idx && 'bg-primary text-primary-foreground font-medium',
                i < idx && 'text-foreground',
                i > idx && 'text-muted-foreground',
              )}
            >
              {i < idx && <Check className="size-3" />}
              {p.label}
            </span>
            {i < PHASES.length - 1 && <span className="bg-border h-px w-3" />}
          </li>
        ))}
      </ol>
      {note && <span className="text-muted-foreground hidden truncate text-xs lg:block">{note}</span>}
    </div>
  )
}
