import { Moon, Sun } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AppSidebar } from '@/components/app-sidebar'
import { ChatMessage } from '@/components/chat-message'
import { Composer } from '@/components/composer'
import { ExamBar } from '@/components/exam-bar'
import { PhaseStepper } from '@/components/phase-stepper'
import { RoadmapView } from '@/components/roadmap-view'
import { Button } from '@/components/ui/button'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Welcome } from '@/components/welcome'
import { useChats } from '@/hooks/use-chats'
import { useRoadmap } from '@/hooks/use-roadmap'
import { useTheme } from '@/hooks/use-theme'
import { currentPhase, examState, lastTool } from '@/lib/guide'

export default function App() {
  const { dark, toggle } = useTheme()
  const roadmap = useRoadmap()
  const [view, setView] = useState<'chat' | 'roadmap'>('chat')
  const [tab, setTab] = useState('overview')
  const onSaved = useCallback((ok: boolean) => { if (ok) roadmap.refresh() }, [roadmap.refresh])
  const wasStreaming = useRef(false)
  const { chats, active, setActiveId, newChat, send, regenerate, stop, remove, rename, streaming } = useChats(onSaved)

  const scroller = useRef<HTMLDivElement>(null)
  const stick = useRef(true)
  useEffect(() => {
    const el = scroller.current
    if (el && stick.current) el.scrollTop = el.scrollHeight
  }, [active?.messages, active?.id, view])

  useEffect(() => {
    if (wasStreaming.current && !streaming) roadmap.refresh()
    wasStreaming.current = streaming
  }, [streaming, roadmap.refresh])

  const msgs = active?.messages ?? []
  const { phase, note } = currentPhase(chats, roadmap.exists, roadmap.state)
  const exam = examState(msgs)
  const lastMsg = msgs[msgs.length - 1]
  const awaitingAnswer =
    !streaming && lastMsg?.role === 'assistant' && lastTool([lastMsg], 'exam_question') !== null
  const go = (t: string) => { stick.current = true; setView('chat'); send(t) }

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar
          chats={chats}
          activeId={active?.id ?? null}
          onSelect={(id) => { setActiveId(id); setView('chat') }}
          onNew={() => { newChat(); setView('chat') }}
          onDelete={remove}
          onRename={rename}
          onOpenRoadmap={(t) => { setTab(t); setView('roadmap'); roadmap.refresh() }}
          view={view}
          tab={tab}
        />
        <SidebarInset className="h-svh">
          <header className="flex h-14 shrink-0 items-center justify-between gap-3 px-3">
            <div className="flex min-w-0 items-center gap-2">
              <SidebarTrigger />
              <PhaseStepper phase={phase} note={note} />
            </div>
            <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
              {dark ? <Sun /> : <Moon />}
            </Button>
          </header>

          {view === 'roadmap' ? (
            <RoadmapView content={roadmap.content} tab={tab} onTab={setTab} onRefresh={roadmap.refresh} />
          ) : (
            <>
              {exam && phase === 'assessment' && <ExamBar state={exam} />}
              {msgs.length === 0 ? (
                <Welcome hasRoadmap={roadmap.exists} onSend={go} />
              ) : (
                <div
                  ref={scroller}
                  className="flex-1 overflow-y-auto"
                  onScroll={(e) => {
                    const el = e.currentTarget
                    stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
                  }}
                >
                  <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-6">
                    {msgs.map((m, i) => (
                      <ChatMessage
                        key={m.id}
                        msg={m}
                        isLast={i === msgs.length - 1}
                        streaming={streaming}
                        onRegenerate={regenerate}
                        onSend={go}
                      />
                    ))}
                  </div>
                </div>
              )}
              {awaitingAnswer && (
                <div className="mx-auto flex w-full max-w-3xl gap-2 px-4 pb-2">
                  <Button variant="outline" size="sm" className="rounded-full" onClick={() => go("I don't know this one.")}>
                    I don't know
                  </Button>
                  <Button variant="outline" size="sm" className="rounded-full" onClick={() => go('Skip this question, next one please.')}>
                    Skip question
                  </Button>
                </div>
              )}
              <Composer streaming={streaming} onSend={go} onStop={stop} />
            </>
          )}
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
