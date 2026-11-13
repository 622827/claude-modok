export type ElfId = 'kutato' | 'iro' | 'ellenorzo'
export type ElfResult = { status: 'idle' | 'running' | 'done' | 'error'; text: string }

declare module 'claude-code' {
  interface PluginState {
    manok: {
      hidden: Shaped<boolean>
      picked: Shaped<Record<ElfId, boolean>>
      tasks: Shaped<Record<ElfId, string>>
      results: Shaped<Record<ElfId, ElfResult>>
    }
  }
}
