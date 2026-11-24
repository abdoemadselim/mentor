import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { type CanUseTool, createSdkMcpServer, query, tool } from '@anthropic-ai/claude-agent-sdk'
import express from 'express'
import { z } from 'zod'

const here = path.dirname(fileURLToPath(import.meta.url))
const WORKSPACE = path.resolve(here, '../..') // the ai-engineering folder
const MENTOR_FILE = path.join(WORKSPACE, 'ai-engineering-mentor.md')
const PATH_FILE = path.join(WORKSPACE, 'ai-engineering-path.md')
const STATE_FILE = path.join(here, 'state.json')
const BLOCKED = /(^|\/)(\.env[^/]*|\.venv|node_modules|\.git)(\/|$)/

const TOPICS = [
  'programming', 'llm-basics', 'prompting', 'structured-outputs', 'tool-calling', 'rag',
  'architecture', 'agents', 'evaluation', 'security', 'ops',
] as const

const ok = async () => ({ content: [{ type: 'text' as const, text: 'Shown to the learner in the UI.' }] })

// UI-facing tools: the model calls them, the browser renders them as real UI.
const mentorServer = createSdkMcpServer({
  name: 'mentor',
  tools: [
    tool(
      'exam_question',
      'Call right BEFORE asking each diagnostic-exam question, so the UI shows progress. Then ask exactly one question (or one small batch) and stop.',
      {
        number: z.number().int().describe('1-based question number'),
        total: z.number().int().describe('planned number of questions (adjust as difficulty adapts)'),
        topic: z.enum(TOPICS),
        kind: z.enum(['concept', 'scenario', 'code-reading', 'code-writing']),
      },
      ok,
    ),
    tool(
      'set_phase',
      'Tell the UI which phase of the journey we are in. Call when the phase changes.',
      {
        phase: z.enum(['assessment', 'discussion', 'roadmap', 'building']),
        note: z.string().describe('one short line: where we are right now'),
      },
      ok,
    ),
    tool(
      'code_task',
      'Give the learner a small coding task (complete a function, fix a bug, write a short snippet). The UI shows an editor prefilled with `starter`. After calling it, explain the task and stop; the learner submits the code as their next message.',
      {
        title: z.string(),
        language: z.string().describe('e.g. python, typescript'),
        starter: z.string().describe('starter code with TODO markers'),
        instructions: z.string().describe('what to implement, 1-4 sentences'),
      },
      ok,
    ),
  ],
})

const ADDENDUM_FILE = path.join(here, 'addendum.md')

const app = express()
app.use(express.json({ limit: '1mb' }))

// Mentor may read the workspace (minus secrets) and write ONLY the roadmap file.
const canUseTool: CanUseTool = async (tool, input) => {
  if (tool.startsWith('mcp__mentor__')) return { behavior: 'allow' }
  const target = String(input.file_path ?? input.path ?? input.pattern ?? '')
  if (tool === 'Read' || tool === 'Glob') {
    const abs = path.resolve(WORKSPACE, target)
    if (tool === 'Read' && (!abs.startsWith(WORKSPACE) || BLOCKED.test(path.relative(WORKSPACE, abs)))) {
      return { behavior: 'deny', message: 'That path is off limits.' }
    }
    return { behavior: 'allow' }
  }
  if ((tool === 'Write' || tool === 'Edit') && path.resolve(WORKSPACE, target) === PATH_FILE) {
    return { behavior: 'allow' }
  }
  return { behavior: 'deny', message: 'The mentor may only edit ai-engineering-path.md.' }
}

// ---- Run learner code locally (python / javascript) ----
const VENV_PY = path.join(WORKSPACE, '.venv/bin/python')
const RUNNERS: Record<string, { cmd: string; ext: string }> = {
  python: { cmd: existsSync(VENV_PY) ? VENV_PY : 'python3', ext: 'py' },
  javascript: { cmd: process.execPath, ext: 'js' },
  typescript: { cmd: process.execPath, ext: 'ts' }, // Node strips types natively
}

app.post('/api/run', async (req, res) => {
  // Custom header forces a CORS preflight, so other websites can't trigger runs.
  if (req.get('x-mentor') !== '1') return res.status(403).json({ error: 'Forbidden' })
  const { language, code } = req.body as { language: string; code: string }
  const runner = RUNNERS[String(language).toLowerCase()]
  if (!runner) return res.json({ stdout: '', stderr: `Running ${language} is not supported (python, javascript, typescript).`, exitCode: 1 })

  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'mentor-run-'))
  const file = path.join(dir, `main.${runner.ext}`)
  await fs.writeFile(file, code)
  // Scrubbed environment: no API keys or tokens from this process reach the code.
  const child = spawn(runner.cmd, [file], { cwd: dir, env: { PATH: process.env.PATH ?? '', HOME: dir, PYTHONUNBUFFERED: '1' } })
  let stdout = ''
  let stderr = ''
  let timedOut = false
  const cap = (s: string) => (s.length > 20000 ? s.slice(0, 20000) + '\n…[output truncated]' : s)
  child.stdout.on('data', (d) => (stdout = cap(stdout + d)))
  child.stderr.on('data', (d) => (stderr = cap(stderr + d)))
  const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL') }, 10000)
  child.on('close', async (exitCode) => {
    clearTimeout(timer)
    await fs.rm(dir, { recursive: true, force: true })
    res.json({ stdout, stderr: timedOut ? stderr + '\nTimed out after 10 s.' : stderr, exitCode })
  })
  child.on('error', async (e) => {
    clearTimeout(timer)
    await fs.rm(dir, { recursive: true, force: true })
    res.json({ stdout, stderr: e.message, exitCode: 1 })
  })
})

app.get('/api/state', async (_req, res) => {
  res.json(JSON.parse(await fs.readFile(STATE_FILE, 'utf8').catch(() => '{}')))
})

app.get('/api/roadmap', async (_req, res) => {
  res.json({ content: await fs.readFile(PATH_FILE, 'utf8').catch(() => '') })
})

app.post('/api/chat', async (req, res) => {
  const { message, sessionId } = req.body as { message: string; sessionId?: string }
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.flushHeaders()
  const send = (event: object) => res.write(`data: ${JSON.stringify(event)}\n\n`)
  const abortController = new AbortController()
  res.on('close', () => abortController.abort())

  try {
    const systemPrompt = (await fs.readFile(MENTOR_FILE, 'utf8')) + '\n\n' + (await fs.readFile(ADDENDUM_FILE, 'utf8'))
    const q = query({
      prompt: message,
      options: {
        systemPrompt,
        cwd: WORKSPACE,
        resume: sessionId,
        abortController,
        includePartialMessages: true,
        settingSources: [], // isolate from the user's global Claude Code config
        tools: ['Read', 'Glob', 'Write', 'Edit'],
        mcpServers: { mentor: mentorServer },
        // Deny rules are enforced even for auto-approved read-only tools.
        disallowedTools: ['Read(**/.env*)', 'Read(**/.venv/**)', 'Read(**/node_modules/**)', 'Read(**/.git/**)'],
        permissionMode: 'default',
        canUseTool,
      },
    })

    let streamedText = false
    const pendingWrites = new Set<string>()
    for await (const m of q) {
      if (m.type === 'system' && m.subtype === 'init') send({ type: 'session', id: m.session_id })
      else if (m.type === 'stream_event') {
        const e = m.event
        // A new text block after earlier text (e.g. after a tool call) needs a paragraph break.
        if (e.type === 'content_block_start' && e.content_block.type === 'text' && streamedText) send({ type: 'text', text: '\n\n' })
        if (e.type === 'content_block_delta' && e.delta.type === 'text_delta') {
          streamedText = true
          send({ type: 'text', text: e.delta.text })
        }
      } else if (m.type === 'assistant') {
        for (const b of m.message.content) {
          if (b.type === 'tool_use') {
            send({ type: 'tool', name: b.name, input: b.input })
            if (b.name === 'mcp__mentor__set_phase') await fs.writeFile(STATE_FILE, JSON.stringify(b.input))
            const target = String((b.input as any)?.file_path ?? '')
            if ((b.name === 'Write' || b.name === 'Edit') && path.resolve(WORKSPACE, target) === PATH_FILE)
              pendingWrites.add(b.id)
          }
        }
      } else if (m.type === 'user' && Array.isArray(m.message.content)) {
        for (const b of m.message.content as any[]) {
          if (b.type === 'tool_result' && pendingWrites.delete(b.tool_use_id))
            send({ type: 'roadmap_saved', ok: !b.is_error })
        }
      } else if (m.type === 'result') {
        if (m.subtype !== 'success') send({ type: 'error', message: `Run ended: ${m.subtype}` })
        else if (!streamedText && m.result) send({ type: 'text', text: m.result })
      }
    }
    send({ type: 'done' })
  } catch (e: any) {
    if (!abortController.signal.aborted) send({ type: 'error', message: e.message ?? String(e) })
  }
  res.end()
})

app.listen(8787, '127.0.0.1', () => console.log('Mentor API (Claude Code) on http://localhost:8787'))
