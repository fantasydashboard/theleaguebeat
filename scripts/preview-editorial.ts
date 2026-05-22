/**
 * preview-editorial.ts — CLI proof of the detection → selection →
 * rendering pipeline. Reads the categoriesLeague fixture, maps it
 * into a `CategoryLeagueData`, renders the Home page editorial, and
 * prints the result in a magazine-style layout.
 *
 * Run:   node scripts/preview-editorial.ts
 *
 * (Node 24+ strips TypeScript natively, so no transpiler is needed.
 * Imports must use `.ts` extensions, as enforced by the project's
 * `allowImportingTsExtensions` tsconfig flag.)
 */

import { renderHomePageWithSignals } from '../src/editorial/render.ts'
import { categoriesFixtureToLeagueData } from '../src/editorial/fixtureAdapter.ts'

/* ─────────────────────────────────────────────────────────────────
   Layout helpers
───────────────────────────────────────────────────────────────── */

const LINE_WIDTH = 71

function rule(): string {
  return '═'.repeat(LINE_WIDTH)
}

function thinRule(): string {
  return '─'.repeat(LINE_WIDTH)
}

function section(title: string): string {
  return `[${title}]`
}

function indent(text: string, width: number): string {
  return ' '.repeat(width) + text
}

function wrap(text: string, width: number, leftPad = 0): string {
  const pad = ' '.repeat(leftPad)
  const words = text.split(/\s+/)
  const lines: string[] = []
  let current = pad
  for (const word of words) {
    if (current.length + word.length + 1 > width) {
      lines.push(current.replace(/\s+$/, ''))
      current = pad + word + ' '
    } else {
      current += word + ' '
    }
  }
  if (current.trim().length > 0) lines.push(current.replace(/\s+$/, ''))
  return lines.join('\n')
}

/* ─────────────────────────────────────────────────────────────────
   MAIN
───────────────────────────────────────────────────────────────── */

function main(): void {
  const data = categoriesFixtureToLeagueData()
  const result = renderHomePageWithSignals(data)

  const lines: string[] = []

  lines.push(rule())
  lines.push(`HOME PAGE EDITORIAL  —  ${data.leagueName}, Week ${data.currentWeek}`)
  lines.push(rule())
  lines.push('')

  /* HERO */
  lines.push(section(`STORY OF WEEK ${data.currentWeek}`))
  lines.push('')
  lines.push(indent(`Eyebrow:  ${result.hero.eyebrow}`, 2))
  lines.push('')
  lines.push(indent(result.hero.headline, 2))
  lines.push('')
  lines.push(wrap(result.hero.body, LINE_WIDTH, 2))
  lines.push('')

  /* PLAYOFF PUSH */
  lines.push(section('PLAYOFF PUSH'))
  lines.push('')
  lines.push(wrap(result.playoffPushCloser, LINE_WIDTH, 2))
  lines.push('')

  /* AROUND THE LEAGUE (ticker) */
  lines.push(section('AROUND THE LEAGUE'))
  lines.push('')
  for (const row of result.ticker) {
    const eb = (row.eyebrow ?? '').padEnd(14, ' ')
    lines.push(`  > ${eb}  ${row.headline}`)
  }
  lines.push('')

  /* QUICK READS */
  lines.push(section('QUICK READS'))
  lines.push('')
  for (const pill of result.quickReads) {
    lines.push(`  - ${pill.label.padEnd(22, ' ')}  ${pill.value}`)
  }
  lines.push('')

  /* DETECTION SIGNALS */
  lines.push(rule())
  lines.push('DETECTION SIGNALS')
  lines.push(thinRule())
  for (const slot of ['hero', 'playoffPush', 'ticker', 'quickReads'] as const) {
    const slotSignals = result.signals.filter((s) => s.slot === slot)
    if (slotSignals.length === 0) continue
    lines.push(`  ${slot.toUpperCase()}`)
    for (const s of slotSignals) {
      const mark = s.selected ? '*' : ' '
      lines.push(`    ${mark}  [w=${String(s.weight).padStart(3, ' ')}]  ${s.kind.padEnd(32, ' ')} ${s.signal}`)
    }
  }
  lines.push(rule())

  console.log(lines.join('\n'))
}

main()
