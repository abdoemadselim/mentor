import { useCallback, useEffect, useRef, useState } from 'react'
import { type Chat, type Msg, streamChat, uid } from '@/lib/chat'

const KEY = 'mentor.chats.v1'

function load(): Chat[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]')
  } catch {
    return []
  }
}

export function useChats(onRoadmapSaved: (ok: boolean) => void) {
  const [chats, setChats] = useState<Chat[]>(load)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [streaming, setStreaming] = useState(false)
  const abort = useRef<AbortController | null>(null)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(chats))
    } catch {
      /* storage unavailable */
    }
  }, [chats])

  const active = chats.find((c) => c.id === activeId) ?? null

  const patch = useCallback((id: string, fn: (c: Chat) => Chat) => {
    setChats((cs) => cs.map((c) => (c.id === id ? fn(c) : c)))
  }, [])

  const patchLast = useCallback(
    (id: string, fn: (m: Msg) => Msg) =>
      patch(id, (c) => ({
        ...c,
        updatedAt: Date.now(),
        messages: c.messages.map((m, i) => (i === c.messages.length - 1 ? fn(m) : m)),
      })),
    [patch],
  )

  const run = useCallback(
    async (chatId: string, text: string, sessionId?: string) => {
      const ac = new AbortController()
      abort.current = ac
      setStreaming(true)
      try {
        await streamChat(
          text,
          sessionId,
          {
            onSession: (id) => patch(chatId, (c) => ({ ...c, sessionId: id })),
            onText: (t) => patchLast(chatId, (m) => ({ ...m, content: m.content + t })),
            onTool: (name, input) =>
              patchLast(chatId, (m) => ({ ...m, tools: [...(m.tools ?? []), { name, input }] })),
            onRoadmapSaved,
          },
          ac.signal,
        )
      } catch (e) {
        if (!ac.signal.aborted) patchLast(chatId, (m) => ({ ...m, error: (e as Error).message }))
      } finally {
        setStreaming(false)
      }
    },
    [patch, patchLast, onRoadmapSaved],
  )

  const send = useCallback(
    (text: string) => {
      if (streaming) return
      const user: Msg = { id: uid(), role: 'user', content: text }
      const bot: Msg = { id: uid(), role: 'assistant', content: '' }
      let id = activeId
      if (!id) {
        id = uid()
        const chat: Chat = {
          id,
          title: text.slice(0, 48),
          messages: [user, bot],
          updatedAt: Date.now(),
        }
        setChats((cs) => [chat, ...cs])
        setActiveId(id)
      } else {
        patch(id, (c) => ({ ...c, messages: [...c.messages, user, bot] }))
      }
      void run(id, text, active?.sessionId)
    },
    [active, activeId, patch, run, streaming],
  )

  const regenerate = useCallback(() => {
    if (!active || streaming) return
    const msgs = active.messages
    const lastUser = [...msgs].reverse().find((m) => m.role === 'user')
    if (!lastUser) return
    patch(active.id, (c) => ({
      ...c,
      messages: [...c.messages.slice(0, -1), { id: uid(), role: 'assistant', content: '' }],
    }))
    void run(active.id, lastUser.content, active.sessionId)
  }, [active, patch, run, streaming])

  const stop = useCallback(() => abort.current?.abort(), [])
  const remove = useCallback(
    (id: string) => {
      setChats((cs) => cs.filter((c) => c.id !== id))
      if (id === activeId) setActiveId(null)
    },
    [activeId],
  )
  const rename = useCallback(
    (id: string, title: string) => patch(id, (c) => ({ ...c, title })),
    [patch],
  )

  return {
    chats: [...chats].sort((a, b) => b.updatedAt - a.updatedAt),
    active,
    setActiveId,
    newChat: () => setActiveId(null),
    send,
    regenerate,
    stop,
    remove,
    rename,
    streaming,
  }
}
