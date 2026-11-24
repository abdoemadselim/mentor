import { BarChart3, FolderKanban, GraduationCap, Map, MoreHorizontal, Pencil, SquarePen, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import type { Chat } from '@/lib/chat'

const DAY = 864e5
function bucket(t: number) {
  const d = Date.now() - t
  return d < DAY ? 'Today' : d < 2 * DAY ? 'Yesterday' : d < 7 * DAY ? 'Previous 7 days' : 'Older'
}

interface Props {
  chats: Chat[]
  activeId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  onDelete: (id: string) => void
  onRename: (id: string, title: string) => void
  onOpenRoadmap: (tab: string) => void
  view: 'chat' | 'roadmap'
  tab: string
}

export function AppSidebar({ chats, activeId, onSelect, onNew, onDelete, onRename, onOpenRoadmap, view, tab }: Props) {
  const { isMobile, setOpenMobile } = useSidebar()
  const [editing, setEditing] = useState<string | null>(null)
  const groups = ['Today', 'Yesterday', 'Previous 7 days', 'Older']
    .map((g) => [g, chats.filter((c) => bucket(c.updatedAt) === g)] as const)
    .filter(([, cs]) => cs.length)
  const close = () => isMobile && setOpenMobile(false)

  return (
    <Sidebar>
      <SidebarHeader className="gap-1 p-2">
        <div className="flex items-center gap-2 px-2 py-2 font-semibold">
          <GraduationCap className="size-5" /> AI Mentor
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => { onNew(); close() }}>
              <SquarePen /> New chat
            </SidebarMenuButton>
          </SidebarMenuItem>
          {[
            ['overview', 'My roadmap', Map],
            ['projects', 'Project tracker', FolderKanban],
            ['competencies', 'Competencies', BarChart3],
          ].map(([key, label, Icon]: any) => (
            <SidebarMenuItem key={key}>
              <SidebarMenuButton isActive={view === 'roadmap' && tab === key} onClick={() => { onOpenRoadmap(key); close() }}>
                <Icon /> {label}
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {groups.map(([label, cs]) => (
          <SidebarGroup key={label}>
            <SidebarGroupLabel>{label}</SidebarGroupLabel>
            <SidebarMenu>
              {cs.map((c) => (
                <SidebarMenuItem key={c.id}>
                  {editing === c.id ? (
                    <input
                      autoFocus
                      defaultValue={c.title}
                      className="bg-background h-8 w-full rounded-md border px-2 text-sm outline-none"
                      onBlur={(e) => { onRename(c.id, e.target.value.trim() || c.title); setEditing(null) }}
                      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                    />
                  ) : (
                    <SidebarMenuButton isActive={view === 'chat' && c.id === activeId} onClick={() => { onSelect(c.id); close() }}>
                      <span className="truncate">{c.title}</span>
                    </SidebarMenuButton>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<SidebarMenuAction showOnHover />}>
                      <MoreHorizontal />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="right" align="start">
                      <DropdownMenuItem onClick={() => setEditing(c.id)}><Pencil /> Rename</DropdownMenuItem>
                      <DropdownMenuItem variant="destructive" onClick={() => onDelete(c.id)}><Trash2 /> Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}
        {!chats.length && <p className="text-muted-foreground px-4 py-2 text-sm">No conversations yet.</p>}
      </SidebarContent>
      <SidebarFooter className="p-3">
        <Button variant="ghost" className="text-muted-foreground justify-start text-xs" disabled>
          Senior AI Engineering Mentor
        </Button>
      </SidebarFooter>
    </Sidebar>
  )
}
