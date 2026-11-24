import type { Chat, Msg } from '@/lib/chat'

// Everything below mirrors ai-engineering-mentor.md
export const TOPICS = [
  { key: 'programming', label: 'Programming & backend' },
  { key: 'llm-basics', label: 'LLM fundamentals & APIs' },
  { key: 'prompting', label: 'Prompting & context' },
  { key: 'structured-outputs', label: 'Structured outputs' },
  { key: 'tool-calling', label: 'Tool calling' },
  { key: 'rag', label: 'Embeddings, vector DBs & RAG' },
  { key: 'architecture', label: 'App architecture' },
  { key: 'agents', label: 'Agents & workflows' },
  { key: 'evaluation', label: 'Evaluation & reliability' },
  { key: 'security', label: 'Security & guardrails' },
  { key: 'ops', label: 'Testing, observability & cost' },
] as const

export const PHASES = [
  { key: 'assessment', label: 'Assess', hint: 'Phase 1 · Diagnostic exam' },
  { key: 'discussion', label: 'Discuss', hint: 'Review results & agree direction' },
  { key: 'roadmap', label: 'Roadmap', hint: 'Phase 2 · Personalized roadmap' },
  { key: 'building', label: 'Build', hint: 'Learning by building projects' },
] as const
export type PhaseKey = (typeof PHASES)[number]['key']

export const LEVELS = ['Not covered', 'Introduced', 'Developing', 'Competent', 'Independent'] as const

export const toolName = (n: string) => n.replace(/^mcp__mentor__/, '')

export function lastTool(msgs: Msg[], name: string) {
  for (let i = msgs.length - 1; i >= 0; i--) {
    const t = [...(msgs[i].tools ?? [])].reverse().find((t) => toolName(t.name) === name)
    if (t) return { input: t.input, index: i }
  }
  return null
}

export function examState(msgs: Msg[]) {
  const covered = new Set<string>()
  let last: { number: number; total: number; topic: string; kind: string } | null = null
  for (const m of msgs)
    for (const t of m.tools ?? [])
      if (toolName(t.name) === 'exam_question') {
        covered.add(String(t.input.topic))
        last = t.input as never
      }
  return last ? { covered, last } : null
}

export function currentPhase(
  chats: Chat[],
  roadmapExists: boolean,
  server?: { phase?: string; note?: string },
): { phase: PhaseKey; note?: string } {
  // The server remembers the latest phase across browsers and cleared chats.
  if (server?.phase && PHASES.some((p) => p.key === server.phase)) return { phase: server.phase as PhaseKey, note: server.note }
  for (const c of chats) {
    const t = lastTool(c.messages, 'set_phase')
    if (t) return { phase: t.input.phase as PhaseKey, note: String(t.input.note ?? '') }
  }
  return { phase: roadmapExists ? 'building' : 'assessment' }
}

// ---- roadmap file parsing (structure is enforced by the mentor's prompt) ----
export function sections(md: string) {
  const out: Record<string, string> = {}
  for (const part of md.split(/^## /m).slice(1)) {
    const letter = part.match(/^([A-E])\./)?.[1]
    if (letter) out[letter] = part.replace(/^.*\n/, '').trim()
  }
  return out
}

export function parseTable(md: string) {
  const rows = md.split('\n').filter((l) => l.trim().startsWith('|'))
  if (rows.length < 3) return []
  const cells = (l: string) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim())
  const head = cells(rows[0])
  return rows.slice(2).map((r) => Object.fromEntries(cells(r).map((c, i) => [head[i] ?? i, c])))
}

export function levelOf(text: string) {
  const n = Number(text.match(/^([1-5])\b/)?.[1])
  return n || 0
}
