export type Role = 'user' | 'assistant'
export interface Msg {
  id: string
  role: Role
  content: string
  tools?: { name: string; input: Record<string, unknown> }[]
  error?: string
}
export interface Chat {
  id: string
  title: string
  messages: Msg[]
  sessionId?: string
  updatedAt: number
}

export const uid = () => crypto.randomUUID()

export async function streamChat(
  message: string,
  sessionId: string | undefined,
  handlers: {
    onSession: (id: string) => void
    onText: (t: string) => void
    onTool: (name: string, input: Record<string, unknown>) => void
    onRoadmapSaved: (ok: boolean) => void
  },
  signal: AbortSignal,
) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, sessionId }),
    signal,
  })
  if (!res.ok || !res.body) throw new Error(`Server error (${res.status}). Is the API running?`)
  const reader = res.body.getReader()
  const dec = new TextDecoder()
  let buf = ''
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    const parts = buf.split('\n\n')
    buf = parts.pop() ?? ''
    for (const p of parts) {
      if (!p.startsWith('data: ')) continue
      const ev = JSON.parse(p.slice(6))
      if (ev.type === 'session') handlers.onSession(ev.id)
      else if (ev.type === 'text') handlers.onText(ev.text)
      else if (ev.type === 'tool') handlers.onTool(ev.name, ev.input)
      else if (ev.type === 'roadmap_saved') handlers.onRoadmapSaved(ev.ok)
      else if (ev.type === 'error') throw new Error(ev.message)
    }
  }
}
