import { RefreshCw } from 'lucide-react'
import { type ComponentProps, type ReactNode, useMemo } from 'react'
import { Markdown } from '@/components/markdown'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { LEVELS, levelOf, parseTable, sections } from '@/lib/guide'

const txt = (n: ReactNode): string => (typeof n === 'string' ? n : Array.isArray(n) ? n.map(txt).join('') : '')

const STATUS: Record<string, string> = {
  planned: 'bg-muted text-muted-foreground',
  'in progress': 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  completed: 'bg-green-500/15 text-green-600 dark:text-green-400',
  'needs improvement': 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
}

function LevelBar({ level }: { level: number }) {
  return (
    <div className="flex items-center gap-2 whitespace-nowrap">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className={cn('h-2 w-5 rounded-sm', i <= level ? 'bg-primary' : 'bg-muted')} />
        ))}
      </div>
      <span className="text-xs">{LEVELS[level - 1]}</span>
    </div>
  )
}

const tableComponents = {
  td: ({ children }: ComponentProps<'td'>) => {
    const t = txt(children).trim()
    const lvl = levelOf(t)
    if (lvl && /^[1-5]\s+\w/.test(t)) return <td><LevelBar level={lvl} /></td>
    if (STATUS[t.toLowerCase()]) return <td><Badge className={STATUS[t.toLowerCase()]} variant="secondary">{t}</Badge></td>
    if (/^(tiny|small|large)$/i.test(t)) return <td><Badge variant="outline">{t}</Badge></td>
    return <td>{children}</td>
  },
}

function ProjectCard({ p }: { p: Record<string, string> }) {
  const raw = p.Project ?? ''
  const cut = raw.indexOf(':')
  const name = cut > 0 ? raw.slice(0, cut) : raw
  const desc = cut > 0 ? raw.slice(cut + 1).trim() : ''
  const status = (p.Status ?? '').toLowerCase()
  return (
    <div className="flex flex-col gap-2 rounded-2xl border p-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold">{name}</h3>
        <Badge className={STATUS[status] ?? ''} variant="secondary">{p.Status}</Badge>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {p.Size && <Badge variant="outline">{p.Size}</Badge>}
        {p.Language && <Badge variant="outline">{p.Language}</Badge>}
      </div>
      {desc && <p className="text-muted-foreground text-sm">{desc}</p>}
      {p.Concepts && <p className="text-sm"><span className="text-muted-foreground">Concepts: </span>{p.Concepts}</p>}
      {p.Tools && <p className="text-sm"><span className="text-muted-foreground">Tools: </span>{p.Tools}</p>}
      {p.Notes && <p className="text-muted-foreground mt-auto text-xs">{p.Notes}</p>}
    </div>
  )
}

function Empty() {
  return (
    <div className="text-muted-foreground rounded-2xl border border-dashed p-10 text-center text-sm">
      Nothing here yet. Finish the diagnostic exam and agree on a direction, then your mentor fills this in.
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border p-4">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-muted-foreground text-xs">{label}</div>
    </div>
  )
}

export function RoadmapView({ content, tab, onTab, onRefresh }: { content: string | null; tab: string; onTab: (t: string) => void; onRefresh: () => void }) {
  const s = useMemo(() => sections(content ?? ''), [content])
  const projects = useMemo(() => parseTable(s.C ?? ''), [s.C])
  const comps = useMemo(() => parseTable(s.D ?? ''), [s.D])
  const phases = useMemo(() => (s.B ?? '').split(/^### /m).slice(1), [s.B])
  const done = projects.filter((p) => /completed/i.test(p.Status ?? '')).length
  const avg = comps.length ? (comps.reduce((a, c) => a + levelOf(c.Level ?? ''), 0) / comps.length).toFixed(1) : '–'

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-4xl px-4 py-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">My AI engineering path</h1>
          <Button variant="ghost" size="sm" onClick={onRefresh}><RefreshCw /> Refresh</Button>
        </div>
        <Tabs value={tab} onValueChange={onTab}>
          <TabsList className="mb-4 flex h-auto flex-wrap">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="roadmap">Roadmap</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="competencies">Competencies</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {!content?.trim() ? <Empty /> : (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Stat label="Roadmap phases" value={phases.length} />
                  <Stat label="Projects" value={projects.length} />
                  <Stat label="Completed" value={done} />
                  <Stat label="Avg. competency (of 5)" value={avg} />
                </div>
                <section>
                  <h2 className="mb-2 font-semibold">Current learning state</h2>
                  {s.E ? <Markdown>{s.E}</Markdown> : <Empty />}
                </section>
              </>
            )}
          </TabsContent>
          <TabsContent value="profile">{s.A ? <Markdown>{s.A}</Markdown> : <Empty />}</TabsContent>
          <TabsContent value="roadmap" className="space-y-4">
            {phases.length ? phases.map((p, i) => (
              <div key={i} className="rounded-2xl border p-5"><Markdown>{'### ' + p}</Markdown></div>
            )) : <Empty />}
          </TabsContent>
          <TabsContent value="projects">
            {projects.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {projects.map((p, i) => <ProjectCard key={i} p={p} />)}
              </div>
            ) : s.C ? <Markdown components={tableComponents}>{s.C}</Markdown> : <Empty />}
          </TabsContent>
          <TabsContent value="competencies" className="space-y-4">
            <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
              {LEVELS.map((l, i) => <span key={l}>{i + 1} {l}</span>)}
            </div>
            {s.D ? <Markdown components={tableComponents}>{s.D}</Markdown> : <Empty />}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
