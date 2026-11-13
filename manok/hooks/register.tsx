import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { ElfId, ElfResult } from '../types'

const PANE = 'manok'
const IDS: ElfId[] = ['kutato', 'iro', 'ellenorzo']

const ELVES: Record<ElfId, { name: string; icon: string; system: string; hint: string }> = {
  kutato: {
    name: 'Designer',
    icon: '🎨',
    hint: 'Mit tervezzen?',
    system:
      'Te a Designer manó vagy, és te vagy felelős a kinézetért: a vizuális megjelenésért, a felhasználói élményért és az egységes stílusért. Feladatod: konkrét, megvalósítható dizájnt tervezni (elrendezés, színpaletta hex kódokkal, tipográfia, méretek, térközök, állapotok). Magyarul válaszolj. A terved legyen olyan pontos, hogy a Coder manó közvetlenül megvalósíthassa.',
  },
  iro: {
    name: 'Coder',
    icon: '💻',
    hint: 'Mit programozzon?',
    system:
      'Te a Coder manó vagy: gyakorlott programozó. Feladatod: működő, tiszta kódot írni a kért feladatra. Magyarul magyarázz, de a kód legyen kódblokkban. Előbb a kész kód, utána rövid magyarázat arról, hogyan működik és hogyan kell futtatni.',
  },
  ellenorzo: {
    name: 'Auditor',
    icon: '🐞',
    hint: 'Mire figyeljen? (üres: mindent átnéz)',
    system:
      'Te az Auditor manó vagy, egyben bugfixer. Feladatod: a Designer és a Coder munkáját auditálni: hibák, hiányosságok, következetlenségek keresése (a Coder kódja egyezik-e a Designer tervével, vannak-e bugok, biztonsági vagy logikai hibák). Magyarul válaszolj, ebben a sorrendben: 1) talált hibák tételes listája súlyossággal, 2) kijavított kód vagy javított terv, 3) rövid összegzés.',
  },
}

type Look = 'idle' | 'picked' | 'running' | 'done' | 'error'

const COLORS: Record<ElfId, { body: string; dark: string }> = {
  kutato: { body: '#E87FB5', dark: '#B84F85' },
  iro: { body: '#8E7FE8', dark: '#5F4FB8' },
  ellenorzo: { body: '#8FA8C0', dark: '#5F7890' },
}

// Egy kis felhő-manó, Claude-szerű szikrával a fején. SMIL animáció: lebeg, pislog,
// munka közben ugrál és pörög a szikra.
function elfSvg(id: ElfId, look: Look): string {
  const c = COLORS[id]
  const fast = look === 'running'
  const bobDur = fast ? '0.45s' : look === 'picked' ? '1.2s' : '2.8s'
  const bobAmp = fast ? 7 : look === 'picked' ? 4 : 2.5
  const spinDur = fast ? '1.2s' : '8s'
  const glow =
    look === 'picked' || fast
      ? `<ellipse cx="40" cy="74" rx="22" ry="4" fill="${c.body}" opacity="0.35"><animate attributeName="rx" values="18;24;18" dur="${bobDur}" repeatCount="indefinite"/></ellipse>`
      : `<ellipse cx="40" cy="74" rx="18" ry="3" fill="#000" opacity="0.12"/>`
  const eyes =
    look === 'error'
      ? `<path d="M29 38l6 6M35 38l-6 6M45 38l6 6M51 38l-6 6" stroke="#333" stroke-width="2.5" stroke-linecap="round"/>`
      : look === 'done'
        ? `<path d="M28 42q4-7 8 0M44 42q4-7 8 0" stroke="#333" stroke-width="2.8" fill="none" stroke-linecap="round"/>`
        : `<ellipse cx="32" cy="40" rx="3.4" ry="4.4" fill="#2b2b2b"><animate attributeName="ry" values="4.4;4.4;0.4;4.4;4.4" keyTimes="0;0.9;0.94;0.98;1" dur="${look === 'idle' ? '4s' : '3s'}" repeatCount="indefinite"/></ellipse><ellipse cx="48" cy="40" rx="3.4" ry="4.4" fill="#2b2b2b"><animate attributeName="ry" values="4.4;4.4;0.4;4.4;4.4" keyTimes="0;0.9;0.94;0.98;1" dur="${look === 'idle' ? '4s' : '3s'}" repeatCount="indefinite"/></ellipse>`
  const mouth =
    look === 'error'
      ? `<path d="M34 51q6-5 12 0" stroke="#333" stroke-width="2.4" fill="none" stroke-linecap="round"/>`
      : look === 'idle'
        ? `<path d="M35 49q5 4 10 0" stroke="#333" stroke-width="2.2" fill="none" stroke-linecap="round"/>`
        : `<path d="M33 48q7 8 14 0z" fill="#8a2d2d"/>`
  const cheeks = `<ellipse cx="25" cy="47" rx="4" ry="2.4" fill="#fff" opacity="0.45"/><ellipse cx="55" cy="47" rx="4" ry="2.4" fill="#fff" opacity="0.45"/>`
  const torsoColor = id === 'iro' ? '#4a3f6b' : id === 'ellenorzo' ? '#3b4a5a' : '#2b2b33'
  const torso = `<rect x="22" y="56" width="36" height="14" rx="6" fill="${torsoColor}" stroke="${c.dark}" stroke-width="1.6"/>`
  const clothes =
    id === 'iro'
      ? `<path d="M26 58q14 9 28 0" stroke="#2f2748" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M37 62v6M43 62v6" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/><circle cx="37" cy="69" r="1.3" fill="#fff"/><circle cx="43" cy="69" r="1.3" fill="#fff"/><path d="M30 66h20" stroke="#2f2748" stroke-width="1" opacity="0.5"/>`
      : id === 'ellenorzo'
        ? `<path d="M30 58l5 12M50 58l-5 12" stroke="#F59E0B" stroke-width="3.2" stroke-linecap="round"/><path d="M32 66h16" stroke="#F59E0B" stroke-width="1.6" opacity="0.8"/><rect x="36" y="60" width="8" height="7" rx="1.5" fill="#222" stroke="#666" stroke-width="0.8"/>`
        : `<path d="M28 58q12 7 24 0" stroke="#15151a" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M26 64h28M26 67h28" stroke="#e8e8e8" stroke-width="0.8" opacity="0.35"/>`
  const glasses =
    id === 'ellenorzo'
      ? `<circle cx="32" cy="40" r="6.2" fill="#fff" fill-opacity="0.25" stroke="#2a2a2a" stroke-width="1.8"/><circle cx="48" cy="40" r="6.2" fill="#fff" fill-opacity="0.25" stroke="#2a2a2a" stroke-width="1.8"/><path d="M38.2 40h3.6" stroke="#2a2a2a" stroke-width="1.8"/>`
      : id === 'kutato'
        ? `<rect x="25" y="34" width="14" height="11" rx="3" fill="#fff" fill-opacity="0.25" stroke="#F2C94C" stroke-width="2.4"/><rect x="41" y="34" width="14" height="11" rx="3" fill="#fff" fill-opacity="0.25" stroke="#F2C94C" stroke-width="2.4"/><path d="M39 39h2" stroke="#F2C94C" stroke-width="2.4"/>`
        : ''
  const headwear =
    id === 'kutato'
      ? `<ellipse cx="36" cy="26" rx="19" ry="6" fill="#2b2b33" transform="rotate(-8 36 26)"/><circle cx="46" cy="19" r="2.2" fill="#2b2b33"/>`
      : id === 'iro'
        ? `<path d="M19 40q0-18 21-18t21 18" stroke="#2f2748" stroke-width="3.2" fill="none" stroke-linecap="round"/><rect x="15" y="35" width="7" height="14" rx="3.5" fill="#2f2748"/><rect x="58" y="35" width="7" height="14" rx="3.5" fill="#2f2748"/><rect x="17" y="38" width="3" height="8" rx="1.5" fill="#6EE7B7"/><rect x="60" y="38" width="3" height="8" rx="1.5" fill="#6EE7B7"/>`
        : ''
  // kis kellék a manó szerepéhez
  const prop =
    id === 'kutato'
      ? `<g transform="translate(55 50)"><path d="M3 2c-5 0-6 8-1 11 3 2 7 1 11 3 5 1 7-4 5-8-2-5-9-6-15-6z" fill="#e9c79b" stroke="#8a6b3a" stroke-width="1.4"/><circle cx="6" cy="6" r="1.8" fill="#E8503A"/><circle cx="11" cy="4" r="1.8" fill="#4F9BE8"/><circle cx="14" cy="9" r="1.8" fill="#F2C94C"/><path d="M10 14l8-10" stroke="#8a4b2a" stroke-width="1.6" stroke-linecap="round"/></g>`
      : id === 'iro'
        ? `<g transform="translate(52 54)"><rect x="0" y="0" width="22" height="14" rx="1.6" fill="#222" stroke="#666" stroke-width="1"/><path d="M3 3h8M3 6h12M5 9h7" stroke="#6EE7B7" stroke-width="1.2" stroke-linecap="round"/><path d="M-2 14h26l-2 3H0z" fill="#9a9aa8"/><circle cx="18" cy="9" r="2" fill="#F472B6"/></g>`
        : `<g transform="translate(55 48)"><circle cx="7" cy="7" r="7" fill="#fff" fill-opacity="0.5" stroke="#3a3a44" stroke-width="2"/><path d="M12 12l7 8" stroke="#3a3a44" stroke-width="3" stroke-linecap="round"/><ellipse cx="7" cy="8" rx="2.6" ry="3.2" fill="#E8503A"/><circle cx="7" cy="4.4" r="1.4" fill="#333"/><path d="M4 6l-3-2M4 9l-3 1M10 6l3-2M10 9l3 1" stroke="#333" stroke-width="0.8"/><path d="M7 5v7" stroke="#222" stroke-width="0.7"/></g>`
  const spark = `<g transform="translate(40 14)"><g><animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="${spinDur}" repeatCount="indefinite"/>${[0, 45, 90, 135]
    .map(a => `<rect x="-1.6" y="-9" width="3.2" height="18" rx="1.6" fill="#D97757" transform="rotate(${a})"/>`)
    .join('')}</g></g>`
  const cloud = `<path d="M18 58c-9 0-12-13-3-17-2-10 9-16 16-10 3-8 17-8 20 1 9-3 17 6 12 14 8 5 4 14-5 14z" fill="${c.body}" stroke="${c.dark}" stroke-width="2.2" stroke-linejoin="round"/>`
  const feet = `<ellipse cx="30" cy="70" rx="6" ry="3.5" fill="${c.dark}"/><ellipse cx="50" cy="70" rx="6" ry="3.5" fill="${c.dark}"/>`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" width="80" height="80">${glow}<g><animateTransform attributeName="transform" type="translate" values="0 0;0 -${bobAmp};0 0" dur="${bobDur}" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.5;1" keySplines="0.45 0 0.55 1;0.45 0 0.55 1"/>${feet}${torso}${cloud}${clothes}${cheeks}${eyes}${mouth}${glasses}${headwear}${spark}${prop}</g></svg>`
}

const hidden = atom({ plugin: 'manok', key: 'hidden' } as const, false, { shape: 'hidden-1' })
const picked = atom({ plugin: 'manok', key: 'picked' } as const, { kutato: false, iro: false, ellenorzo: false }, { shape: 'picked-1' })
const tasks = atom({ plugin: 'manok', key: 'tasks' } as const, { kutato: '', iro: '', ellenorzo: '' }, { shape: 'tasks-1' })
const results = atom(
  { plugin: 'manok', key: 'results' } as const,
  {
    kutato: { status: 'idle', text: '' },
    iro: { status: 'idle', text: '' },
    ellenorzo: { status: 'idle', text: '' },
  },
  { shape: 'results-1' },
)

function setResult(id: ElfId, r: ElfResult, $: any) {
  return update($, results, all => ({ ...all, [id]: r }))
}

async function start($: any, main: string) {
  const p = await read($, picked)
  const t = await read($, tasks)
  const chosen = IDS.filter(id => p[id])
  if (chosen.length === 0) return
  for (const id of chosen) await setResult(id, { status: 'idle', text: '' }, $)
  const out: Partial<Record<ElfId, string>> = {}

  // Sorrend: Designer -> Coder -> Auditor. Mindegyik megkapja az előző(ek) munkáját.
  for (const id of chosen) {
    // Ha a manónak nincs saját feladata, a fő üzeneted a feladata.
    let task = t[id].trim() || main
    let prompt = task
    if (id === 'iro' && out.kutato) {
      prompt = `${task || 'Valósítsd meg a Designer tervét.'}\n\n--- A Designer terve ---\n${out.kutato}`
      task = prompt
    }
    if (id === 'ellenorzo' && (out.kutato || out.iro)) {
      prompt = `${task || 'Auditáld és javítsd a többi manó munkáját.'}`
      if (out.kutato) prompt += `\n\n--- A Designer munkája ---\n${out.kutato}`
      if (out.iro) prompt += `\n\n--- A Coder munkája ---\n${out.iro}`
      task = prompt
    }
    if (task === '') {
      await setResult(id, { status: 'error', text: 'Nem írtál feladatot ennek a manónak.' }, $)
      continue
    }
    await setResult(id, { status: 'running', text: '' }, $)
    try {
      // A manó az adott chat teljes beszélgetésére építve dolgozik (fork), ezért hozzá tud szólni.
      // Üres chatben nincs mire építeni: ott sima kérés megy.
      const framed = `${ELVES[id].system}\n\nA fenti beszélgetésből ismered a háttért. Ne a beszélgetésre válaszolj, hanem a következő feladatot oldd meg a saját szerepedben, a beszélgetés tartalmát felhasználva, ha releváns. Eszközt nem használhatsz, csak szöveggel válaszolsz.\n\nFELADAT:\n${prompt}`
      let r = await $.model.fork({ prompt: framed, effort: 'medium' })
      if (!r.isAnswered && r.reason === 'nothing-to-fork') {
        r = await $.model.complete({
          model: 'sonnet',
          system: ELVES[id].system,
          prompt,
          maxTokens: 2500,
          timeoutMs: 240000,
        })
      }
      if (r.isAnswered) {
        out[id] = r.text
        await setResult(id, { status: 'done', text: r.text }, $)
      } else {
        await setResult(id, { status: 'error', text: `Nem sikerült (${r.reason}).` }, $)
      }
    } catch (err) {
      await setResult(id, { status: 'error', text: `Hiba: ${String(err)}` }, $)
    }
  }
}


export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'manok', description: 'A manók mutatása / elrejtése a szövegmező felett' })
    return next(e)
  })

  // A manók mindig együtt indulnak a fő üzeneteddel (a / parancsokat kihagyja).
  on('prompt.submit', async ($, e, next) => {
    const text = String((e as any).text ?? '').trim()
    if (!text.startsWith('/')) void start($, text)
    return next(e)
  })

  on('command.run', { command: 'manok' }, async $ => {
    const wasHidden = await read($, hidden)
    await update($, hidden, () => !wasHidden)
    return { text: wasHidden ? 'A manók megjelentek a szövegmező felett.' : 'A manók elrejtve. /manok: újra elő.' }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || (await read($, hidden))) return next(e)
    const { Box, Text, Button, Input, Markdown, Svg } = $.ui.resolve(e) as any
    const p = await read($, picked)
    const t = await read($, tasks)
    const res = await read($, results)

    const look = (id: ElfId): Look =>
      res[id].status === 'running'
        ? 'running'
        : res[id].status === 'done'
          ? 'done'
          : res[id].status === 'error'
            ? 'error'
            : p[id]
              ? 'picked'
              : 'idle'
    const label = (id: ElfId) =>
      res[id].status === 'running'
        ? 'dolgozik…'
        : res[id].status === 'done'
          ? 'kész'
          : res[id].status === 'error'
            ? 'hiba'
            : ''
    const hasResults = IDS.some(id => res[id].status !== 'idle')

    return (
      <Box flexDirection="column" gap={1}>
        <Box gap={2} alignItems="center" flexWrap="wrap">
          {hasResults && (
            <Button
              key="clear"
              variant="secondary"
              label="Törlés"
              onPress={() =>
                update($, results, () => ({
                  kutato: { status: 'idle', text: '' },
                  iro: { status: 'idle', text: '' },
                  ellenorzo: { status: 'idle', text: '' },
                }))
              }
            />
          )}
        </Box>

        <Box flexDirection="row" columnGap={2} alignItems="flex-start" width="100%">
        {IDS.map(id => {
          const bent = p[id]
          return (
            <Box key={`col-${id}`} flexDirection="column" rowGap={1} width="32%" overflow="hidden">
              <Box flexWrap="wrap" gap={1} alignItems="center">
                {Svg ? (
                  <Svg source={elfSvg(id, look(id))} alt={`${ELVES[id].name} manó`} width={bent ? 36 : 26} height={bent ? 36 : 26} />
                ) : (
                  <Text>{ELVES[id].icon}</Text>
                )}
                <Button
                  key={`pick-${id}`}
                  variant={bent ? 'primary' : 'secondary'}
                  label={`${bent ? '✔ ' : ''}${ELVES[id].name}`}
                  onPress={() => update($, picked, all => ({ ...all, [id]: !all[id] }))}
                />
                {label(id) !== '' && <Text dimColor>{label(id)}</Text>}
              </Box>
              <Box display={bent ? 'flex' : 'none'} width="100%">
                <Input
                  key={`task-${id}`}
                  placeholder={ELVES[id].hint}
                  value={t[id]}
                  rows={4}
                  submitLabel="OK"
                  onInput={v => update($, tasks, all => ({ ...all, [id]: v }))}
                  onSubmit={v => update($, tasks, all => ({ ...all, [id]: v }))}
                />
              </Box>
            </Box>
          )
        })}
        </Box>


        {IDS.filter(id => res[id].status !== 'idle').map(id => (
          <Box
            key={`res-${id}`}
            flexDirection="column"
            gap={1}
            paddingX={1}
            paddingY={0}
          >
            <Box justifyContent="space-between" alignItems="center">
              <Text bold color={COLORS[id].body}>{ELVES[id].name} eredménye</Text>
              {res[id].status === 'done' && (
                <Button
                  key={`copy-${id}`}
                  variant="primary"
                  label="Másolás"
                  onPress={press => $.ui.copy({ text: res[id].text, surface: press.surface })}
                />
              )}
            </Box>
            {res[id].status === 'running' && <Text dimColor>Dolgozik…</Text>}
            {res[id].status === 'error' && <Text color="red">{res[id].text}</Text>}
            {res[id].status === 'done' && <Markdown>{res[id].text}</Markdown>}
          </Box>
        ))}
      </Box>
    )
  })
}
