import { ArrowRight, GraduationCap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TOPICS } from '@/lib/guide'

export function Welcome({ hasRoadmap, onSend }: { hasRoadmap: boolean; onSend: (t: string) => void }) {
  if (!hasRoadmap) {
    return (
      <div className="mx-auto flex max-w-2xl flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
        <div className="bg-primary text-primary-foreground flex size-12 items-center justify-center rounded-full">
          <GraduationCap />
        </div>
        <div>
          <h1 className="text-3xl font-semibold">Let's find your starting point</h1>
          <p className="text-muted-foreground mt-3">
            Before any roadmap or project, your mentor runs a short diagnostic exam: one question at a time, mixing concepts,
            scenarios and a little code. No explanations until it's over, so be honest, and say "I don't know" when you don't.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-1.5">
          {TOPICS.map((t) => (
            <span key={t.key} className="text-muted-foreground rounded-full border px-2.5 py-1 text-xs">{t.label}</span>
          ))}
        </div>
        <Button size="lg" className="rounded-full" onClick={() => onSend("I'm ready. Start my diagnostic exam.")}>
          Start the diagnostic <ArrowRight />
        </Button>
      </div>
    )
  }
  const items = [
    'Continue where we left off',
    'Give me the next small project',
    'Quiz me on my weak areas',
    'Update my competency tracker based on what I know now',
    'Review the LangChain_Agent_Evaluation_System project',
    'Suggest a funny, unusual tiny project',
  ]
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-4">
      <h1 className="text-center text-3xl font-semibold">Welcome back. What are we building?</h1>
      <div className="flex max-w-3xl flex-wrap justify-center gap-2">
        {items.map((s) => (
          <Button key={s} variant="outline" className="rounded-full" onClick={() => onSend(s)}>{s}</Button>
        ))}
      </div>
    </div>
  )
}
