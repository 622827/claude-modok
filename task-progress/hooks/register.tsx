import { atom, read, update } from 'claude-code'
import type { Register, Timer } from 'claude-code'

import type { Run } from '../types'

/* Állapotsáv minden feladathoz (a beviteli mező fölött, és az állapotsorban).
   Becslés: az eddigi feladatok időtartamának mediánja (a $.store-ban, sessionök között is megmarad).
   Ha a feladat túlfut a becslésen, a becslés nő (a sáv nem áll meg 100%-on, max. 95%-ig megy). */

const run = atom({ plugin: 'task-progress', key: 'run' } as const, null)
const HIST = 'durations'           // ms-ok listája, a legutóbbi 30
const DEFAULT_MS = 60_000
const WIDTH = 20

function median(a: number[]): number {
  if (!a.length) return DEFAULT_MS
  const s = [...a].sort((x, y) => x - y)
  const m = Math.floor(s.length / 2)
  const hi = s[m] ?? DEFAULT_MS, lo = s[m - 1] ?? hi
  return s.length % 2 ? hi : Math.round((lo + hi) / 2)
}
function clock(ms: number): string {
  const t = Math.max(0, Math.round(ms / 1000))
  const m = Math.floor(t / 60), s = t % 60
  return m >= 60 ? `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`
}
/* A becslés a futás közben: ha az eltelt idő megközelíti, 1,4-szeresére nő. */
function live(r: Run): { pct: number; left: number; elapsed: number } {
  const elapsed = r.now - r.startedAt
  let est = r.estimateMs
  while (elapsed > est * 0.9) est = Math.round(est * 1.4)
  const pct = Math.min(95, Math.round((100 * elapsed) / est))
  return { pct, left: est - elapsed, elapsed }
}
function bar(pct: number): string {
  const full = Math.round((WIDTH * pct) / 100)
  return '█'.repeat(full) + '░'.repeat(WIDTH - full)
}
function line(r: Run): string {
  const { pct, left, elapsed } = live(r)
  return `${bar(pct)} ${pct}% · eltelt ${clock(elapsed)} · hátra ~${clock(left)}`
}

export const register: Register = on => {
  let tick: Timer | undefined

  const stop = () => { tick?.cancel(); tick = undefined }

  on('prompt.submit', async ($, e, next) => {
    const cur = await read($, run)
    if (!cur) {
      const hist = ((await $.store.get(HIST)) as number[] | undefined) ?? []
      const now = await $.clock.now()
      await update($, run, () => ({ startedAt: now, estimateMs: median(hist), now, tools: 0 }))
      stop()
      tick = $.clock.every(1000, async () => {
        const t = await $.clock.now()
        const r = await update($, run, v => (v ? { ...v, now: t } : v))
        if (r) $.ui.status(`Feladat ${line(r)}`)
      })
    }
    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    await update($, run, v => (v ? { ...v, tools: v.tools + 1 } : v))
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId) return next(e)        // csak a fő feladat számít, a subagentek nem
    const r = await read($, run)
    stop()
    if (r) {
      const ms = (await $.clock.now()) - r.startedAt
      if (e.reason === 'answer' && ms > 1500) {
        const hist = ((await $.store.get(HIST)) as number[] | undefined) ?? []
        await $.store.set(HIST, [...hist, ms].slice(-30))
      }
      await update($, run, () => null)
      $.ui.status(undefined)
    }
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const r = await read($, run)
    if (!r) return next(e)
    const { Box, Text } = $.ui.resolve(e)
    const { pct, left, elapsed } = live(r)
    return (
      <Box>
        <Text color="cyan">{bar(pct)}</Text>
        <Text bold> {pct}%</Text>
        <Text dimColor>  eltelt {clock(elapsed)} · hátra ~{clock(left)}{r.tools ? ` · ${r.tools} lépés` : ''}</Text>
      </Box>
    )
  })
}
