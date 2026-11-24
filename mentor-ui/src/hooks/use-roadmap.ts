import { useCallback, useEffect, useState } from 'react'

export interface ServerState {
  phase?: string
  note?: string
}

export function useRoadmap() {
  const [content, setContent] = useState<string | null>(null)
  const [state, setState] = useState<ServerState>({})
  const refresh = useCallback(() => {
    fetch('/api/roadmap')
      .then((r) => r.json())
      .then((d) => setContent(d.content as string))
      .catch(() => setContent((c) => c ?? ''))
    fetch('/api/state')
      .then((r) => r.json())
      .then(setState)
      .catch(() => {})
  }, [])
  useEffect(refresh, [refresh])
  return { content, state, exists: !!content?.trim(), refresh }
}
