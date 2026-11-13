/** A futó feladat: mikor indult, mennyire becsüljük, és a legutóbbi óraütés (ettől rajzol újra a sáv). */
export type Run = { startedAt: number; estimateMs: number; now: number; tools: number }

declare module 'claude-code' {
  interface PluginState {
    'task-progress': { run: Run | null }
  }
}
