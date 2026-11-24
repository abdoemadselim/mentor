export interface RunResult {
  stdout: string
  stderr: string
  exitCode: number | null
}

export const RUNNABLE = ['python', 'javascript', 'typescript']

export async function runCode(language: string, code: string): Promise<RunResult> {
  const res = await fetch('/api/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Mentor': '1' },
    body: JSON.stringify({ language, code }),
  })
  if (!res.ok) throw new Error(`Run failed (${res.status})`)
  return res.json()
}

export const normLang = (l: string) =>
  ({ py: 'python', python3: 'python', js: 'javascript', node: 'javascript', ts: 'typescript' })[l.toLowerCase()] ??
  l.toLowerCase()
