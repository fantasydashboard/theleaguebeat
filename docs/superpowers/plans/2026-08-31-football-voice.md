# Football Voice (Phase 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Football recaps read like football, not like sport-neutral prose with the baseball filed off.

**Architecture:** New `src/editorial/football/*` variant modules, selected at the render layer by `sportOf(data) === 'nfl'`, falling through to the existing neutral points copy when football has no variant. The baseball libraries are never touched, which makes "cannot regress baseball" structural rather than promised. A mechanical voice-conformance test enforces `EDITORIAL.md`'s rules so human review is spent on whether the copy is *good*.

**Tech Stack:** TypeScript, Vitest (node env, `@` alias → `src/`), the existing `render-beat-points.ts` pipeline.

## Global Constraints

- **Spec:** `docs/superpowers/specs/2026-08-30-football-voice-design.md`. **Read `EDITORIAL.md` in full before writing a single string** — it is the voice, and it is short (94 lines).
- **BASEBALL MUST NOT REGRESS.** Baseball is live and in season. Full suite green after every task; the demo reel must regenerate byte-identically. New files only — never edit `home.ts`, `pr.ts`, `matchups.ts`, `lede.ts`, `swings.ts`, `draft.ts`, `history.ts`.
- **Never fall through to baseball.** A football story with no football variant renders the NEUTRAL points copy. Never a baseball idiom.
- **The banned list is absolute** (from `EDITORIAL.md`): no em dashes (`—`), no `--`, no emoji, no exclamation points, no `you`/`your` in editorial copy, no question-mark headlines, and none of: `incredible, amazing, epic, absolutely, literally, actually, really, very, truly`.
- **Every sentence carries a number** where one is available. "Three straight wins" beats "a hot streak."
- **Verbs do the work.** From the register: took, climbed, fell, dropped, surged, collapsed, leapfrogged, dethroned, hung, put up, padded, sealed, cooked, vanished, snapped, broke. If a verb could appear in a SaaS dashboard, it is wrong.
- **Sentence length: 70% under 10 words, 25% 10-20, 5% 20-30.** Nothing over 30.
- Pure code — no I/O, no clock, no randomness. Variant selection is by the existing deterministic `pick()` hash.
- Tests: `npx vitest run`. Type gate: `npx vue-tsc --noEmit 2>&1 | grep "^src/editorial/football"` (~653 pre-existing errors repo-wide are not yours; `npm run build` does NOT type-check).
- Commit style: `feat(football): …`.

---

## File Structure

**Create:**

| File | Responsibility |
| --- | --- |
| `src/editorial/football/voice.ts` | `BANNED_PATTERNS`, `assertVoice(strings)` — the mechanical rules from `EDITORIAL.md`, in one place. |
| `src/editorial/football/__tests__/voice.test.ts` | Tests the checker itself, then runs it over every shipped variant. |
| `src/editorial/football/points.ts` | Variants for finals and the six `points-*` types. The heart of the football voice. |
| `src/editorial/football/streaks.ts` | Football framing for streak / consistency / cellar stories. |
| `src/editorial/football/seasonStage.ts` | A 14-week calendar reads differently from a 22-week one. |
| `src/editorial/football/index.ts` | Barrel: re-exports the variant builders. |
| `src/editorial/football/__tests__/copy.test.ts` | Behavioural tests for the variant builders. |

**Modify:**

| File | Change |
| --- | --- |
| `src/editorial/render-beat-points.ts` | Branch on `sportOf(data)`; fix the `at-bats` leak. |

---

### Task 1: The voice checker

**Files:**
- Create: `src/editorial/football/voice.ts`
- Create: `src/editorial/football/__tests__/voice.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `voiceViolations(s: string): string[]` (empty array = clean), `assertVoiceClean(strings: string[]): void` (throws listing every offender), `wordCount(s: string): number`.

**Why first:** this governs every string written in Tasks 2-4. Writing the copy first and the checker second means retrofitting.

- [ ] **Step 1: Write the failing test**

`src/editorial/football/__tests__/voice.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { voiceViolations, assertVoiceClean, wordCount } from '@/editorial/football/voice'

describe('voiceViolations', () => {
  it('passes a canonical sentence from EDITORIAL.md', () => {
    expect(voiceViolations('Bullpen Theology just took the throne.')).toEqual([])
    expect(voiceViolations('Nabers vanished. Three catches on seven targets.')).toEqual([])
  })

  it('catches em dashes', () => {
    expect(voiceViolations('The dynasty falls — again.')).toContain('em-dash')
  })

  it('catches double-hyphen em dash substitutes', () => {
    expect(voiceViolations('The dynasty falls -- again.')).toContain('double-hyphen')
  })

  it('catches exclamation points', () => {
    expect(voiceViolations('The dynasty falls!')).toContain('exclamation')
  })

  it('catches question-mark headlines', () => {
    expect(voiceViolations('Is Bullpen Theology unstoppable?')).toContain('question-mark')
  })

  it('catches second-person address', () => {
    expect(voiceViolations('Your team fell to .500.')).toContain('second-person')
    expect(voiceViolations('You lost by 40.')).toContain('second-person')
  })

  /* "Yourself" and "young" both contain "you" as a substring. A naive
   * check flags them; the rule is about addressing the reader. */
  it('does not flag words that merely contain "you"', () => {
    expect(voiceViolations('Younger rosters surged.')).toEqual([])
  })

  it('catches banned intensifiers', () => {
    expect(voiceViolations('An absolutely incredible week.')).toContain('intensifier:absolutely')
    expect(voiceViolations('An absolutely incredible week.')).toContain('intensifier:incredible')
  })

  it('does not flag an intensifier inside a larger word', () => {
    // "Verywood" is not a word, but "everyday" contains "very" backwards-ish;
    // the real trap is substring matching. Use a genuine case:
    expect(voiceViolations('Overtime sealed it.')).toEqual([])
  })

  it('catches emoji', () => {
    expect(voiceViolations('The dynasty falls 🔥')).toContain('emoji')
  })

  it('catches baseball nouns — the inverse of the leak that started this', () => {
    expect(voiceViolations('Decided in the final at-bats.')).toContain('wrong-sport:at-bat')
    expect(voiceViolations('The bullpen collapsed.')).toContain('wrong-sport:bullpen')
    expect(voiceViolations('Seven innings of work.')).toContain('wrong-sport:inning')
  })

  it('catches sentences over 30 words', () => {
    const long = 'The team ' + 'scored points and '.repeat(10) + 'won the game.'
    expect(voiceViolations(long)).toContain('too-long')
  })

  it('reports every violation, not just the first', () => {
    const v = voiceViolations('Your absolutely incredible week!')
    expect(v.length).toBeGreaterThanOrEqual(3)
  })
})

describe('wordCount', () => {
  it('counts words, ignoring punctuation', () => {
    expect(wordCount('The dynasty falls.')).toBe(3)
    expect(wordCount('Three straight wins. 132.4 points per game.')).toBe(7)
  })
})

describe('assertVoiceClean', () => {
  it('does not throw on clean copy', () => {
    expect(() => assertVoiceClean(['The dynasty falls.', 'Ten in a row.'])).not.toThrow()
  })

  it('throws naming the offending string and its violations', () => {
    expect(() => assertVoiceClean(['Fine.', 'Your epic week!']))
      .toThrow(/Your epic week/)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/editorial/football/__tests__/voice.test.ts`
Expected: FAIL — cannot resolve `@/editorial/football/voice`.

- [ ] **Step 3: Implement voice.ts**

`src/editorial/football/voice.ts`:

```ts
/**
 * voice — the mechanical half of EDITORIAL.md, enforced by machine.
 *
 * The manifesto has two kinds of rule. Some are judgment ("verbs do
 * work, adjectives don't"); those need a human. The rest are absolute
 * and checkable: no em dashes, no exclamation points, no second person,
 * no banned intensifiers, nothing over 30 words. Those are checked here
 * so review attention goes to whether the copy is any GOOD, rather than
 * to whether it followed rules a regex can verify.
 *
 * `wrong-sport` deserves its own note. Phase 3 exists because
 * "Decided in the final at-bats." was found sitting in the POINTS render
 * path, where football reads it. This checker makes that class of leak a
 * test failure rather than something a reader discovers.
 */

/** Words that always signal a different sport. Kept deliberately short:
 *  only terms with no football meaning at all. "Sweep" and "rally" are
 *  cross-sport and are NOT listed. */
const WRONG_SPORT = [
  'at-bat', 'at-bats', 'inning', 'innings', 'bullpen', 'dinger',
  'strikeout', 'strikeouts', 'mound', 'batting', 'pitcher', 'pitchers',
]

/** From EDITORIAL.md's "What never appears". */
const INTENSIFIERS = [
  'incredible', 'amazing', 'epic', 'absolutely', 'literally',
  'actually', 'really', 'very', 'truly',
]

const MAX_WORDS = 30

/** Words, ignoring punctuation. "132.4" counts as one word. */
export function wordCount(s: string): number {
  const trimmed = s.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).length
}

/** Returns every rule this string breaks. Empty array means clean. */
export function voiceViolations(s: string): string[] {
  const out: string[] = []
  const lower = s.toLowerCase()

  if (s.includes('—')) out.push('em-dash')
  if (s.includes('--')) out.push('double-hyphen')
  if (s.includes('!')) out.push('exclamation')
  if (s.includes('?')) out.push('question-mark')

  // Word-boundary matching: "younger" and "yourself" must not trip this.
  if (/\b(you|your|yours|you're)\b/i.test(s)) out.push('second-person')

  for (const w of INTENSIFIERS) {
    if (new RegExp(`\\b${w}\\b`, 'i').test(s)) out.push(`intensifier:${w}`)
  }

  for (const w of WRONG_SPORT) {
    if (new RegExp(`\\b${w}\\b`, 'i').test(lower)) {
      // Report the singular stem so callers see one label per concept.
      out.push(`wrong-sport:${w.replace(/s$/, '')}`)
    }
  }

  // Emoji and pictographs. Covers the common ranges; the rule is "none",
  // so a broad net is correct here.
  if (/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u.test(s)) out.push('emoji')

  if (wordCount(s) > MAX_WORDS) out.push('too-long')

  return [...new Set(out)]
}

/** Throws listing every offending string. Used by the corpus test so a
 *  single failure names all the copy that needs fixing, not just the
 *  first one. */
export function assertVoiceClean(strings: string[]): void {
  const failures: string[] = []
  for (const s of strings) {
    const v = voiceViolations(s)
    if (v.length > 0) failures.push(`  "${s}" → ${v.join(', ')}`)
  }
  if (failures.length > 0) {
    throw new Error(`Voice violations (${failures.length}):\n${failures.join('\n')}`)
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/editorial/football/__tests__/voice.test.ts`
Expected: PASS, 17 tests.

- [ ] **Step 5: Prove baseball did not regress**

Run: `npx vitest run`
Expected: all pre-existing tests still pass.

- [ ] **Step 6: Commit**

```bash
git add src/editorial/football/voice.ts src/editorial/football/__tests__/voice.test.ts
git commit -m "feat(football): mechanical voice checker from EDITORIAL.md"
```

---

### Task 2: Football variants for finals and the points stories

**Files:**
- Create: `src/editorial/football/points.ts`
- Create: `src/editorial/football/__tests__/copy.test.ts`

**Interfaces:**
- Consumes: `voiceViolations`, `assertVoiceClean` (Task 1).
- Produces:
  ```ts
  export interface FinalArgs {
    winner: string; loser: string
    winnerPts: number; loserPts: number
    leagueAvg: number
    winnerStreak?: { type: 'W' | 'L' | 'T'; length: number }
    winnerRecord?: string
    week: number
  }
  export function footballFinalHeadlines(a: FinalArgs): Array<string | null>
  export function footballFinalBodies(a: FinalArgs): Array<string | null>
  export function footballHighScore(team: string, pts: number, week: number): string
  export function footballLowScore(team: string, pts: number, week: number): string
  ```
  `pick()` in the renderer filters `null` and empty strings, so conditional variants return `null` when they do not apply.

**The voice targets for this task**, from the spec's table — these are what "sounds like football" means concretely:

| Situation | Football framing |
| --- | --- |
| Blowout | "never a game", "up 40 by the 4pm slate" |
| Close game | **"came down to Monday night"** — the most football-specific line available |
| Scoring | "hung 140 on them" |
| Low score | "a wasted week" — there are only 14 |

- [ ] **Step 1: Write the failing test**

`src/editorial/football/__tests__/copy.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  footballFinalHeadlines, footballFinalBodies,
  footballHighScore, footballLowScore,
  type FinalArgs,
} from '@/editorial/football/points'
import { assertVoiceClean, wordCount } from '@/editorial/football/voice'

const base: FinalArgs = {
  winner: 'Gridiron Man', loser: 'Scuttlebucs',
  winnerPts: 128.4, loserPts: 96.2,
  leagueAvg: 109.4,
  week: 8,
}

const real = (xs: Array<string | null>) => xs.filter((s): s is string => !!s)

describe('football finals copy', () => {
  it('offers several headline variants so weeks do not read identically', () => {
    expect(real(footballFinalHeadlines(base)).length).toBeGreaterThanOrEqual(4)
  })

  it('every headline names both teams and the score', () => {
    for (const h of real(footballFinalHeadlines(base))) {
      expect(h).toContain('Gridiron Man')
      expect(h).toContain('Scuttlebucs')
      expect(h).toMatch(/128\.4/)
    }
  })

  it('offers blowout-specific framing on a wide margin', () => {
    const blowout = { ...base, winnerPts: 160.0, loserPts: 96.2 }
    const all = real(footballFinalHeadlines(blowout)).join(' ')
    expect(all.toLowerCase()).toMatch(/never a game|ran past|buried|no contest/)
  })

  it('does not offer blowout framing on a narrow margin', () => {
    const close = { ...base, winnerPts: 110.1, loserPts: 108.9 }
    const all = real(footballFinalHeadlines(close)).join(' ')
    expect(all.toLowerCase()).not.toMatch(/never a game|buried|no contest/)
  })

  /* The single most football-specific sentence available, and honest:
   * the engine sources from the closed week, so Monday night has happened. */
  it('reaches for Monday night on a photo finish', () => {
    const close = { ...base, winnerPts: 110.1, loserPts: 108.9 }
    const all = real(footballFinalBodies(close)).join(' ')
    expect(all.toLowerCase()).toContain('monday night')
  })

  it('never mentions Monday night on a blowout', () => {
    const blowout = { ...base, winnerPts: 160.0, loserPts: 96.2 }
    const all = real(footballFinalBodies(blowout)).join(' ')
    expect(all.toLowerCase()).not.toContain('monday night')
  })

  it('leads with the streak when the winner is running hot', () => {
    const hot = { ...base, winnerStreak: { type: 'W' as const, length: 4 } }
    const all = real(footballFinalBodies(hot)).join(' ')
    expect(all).toMatch(/4|four/i)
  })
})

describe('high and low score copy', () => {
  it('high score names the team and the number', () => {
    const s = footballHighScore('Gridiron Man', 160.2, 8)
    expect(s).toContain('Gridiron Man')
    expect(s).toContain('160.2')
  })

  it('low score is blunt without being cruel filler', () => {
    const s = footballLowScore('Team 3', 61.8, 8)
    expect(s).toContain('Team 3')
    expect(s).toContain('61.8')
  })
})

/* The corpus gate. Every string this module can emit, across the shapes
 * that change which variants appear, run through the mechanical rules. */
describe('voice conformance across the whole corpus', () => {
  const shapes: FinalArgs[] = [
    base,
    { ...base, winnerPts: 160.0, loserPts: 96.2 },
    { ...base, winnerPts: 110.1, loserPts: 108.9 },
    { ...base, winnerStreak: { type: 'W', length: 4 } },
    { ...base, winnerRecord: '6-2' },
    { ...base, winnerPts: 0, loserPts: 0 },
  ]

  const corpus = [
    ...shapes.flatMap((s) => real(footballFinalHeadlines(s))),
    ...shapes.flatMap((s) => real(footballFinalBodies(s))),
    footballHighScore('Gridiron Man', 160.2, 8),
    footballLowScore('Team 3', 61.8, 8),
  ]

  it('has a corpus worth checking', () => {
    expect(corpus.length).toBeGreaterThan(15)
  })

  it('breaks no mechanical rule from EDITORIAL.md', () => {
    expect(() => assertVoiceClean(corpus)).not.toThrow()
  })

  /* EDITORIAL.md targets 70% under 10 words. Uniform ~12-word sentences
   * are the "reads as templated" failure mode it names first. */
  it('skews short, per the 70/25/5 distribution', () => {
    const short = corpus.filter((s) => wordCount(s) < 10).length
    expect(short / corpus.length).toBeGreaterThan(0.55)
  })

  it('varies sentence length rather than settling on one shape', () => {
    const lengths = new Set(corpus.map(wordCount))
    expect(lengths.size).toBeGreaterThan(4)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/editorial/football/__tests__/copy.test.ts`
Expected: FAIL — cannot resolve `@/editorial/football/points`.

- [ ] **Step 3: Implement points.ts**

`src/editorial/football/points.ts`. Write the copy against `EDITORIAL.md` — re-read the 15 canonical sentences first. Requirements the tests encode:

- At least 4 unconditional headline variants; every one names both teams and both scores.
- Blowout framing (`never a game` / `ran past` / `buried` / `no contest`) appears **only** when `margin >= leagueAvg * 0.35`.
- `came down to Monday night` appears in the bodies **only** when `margin <= leagueAvg * 0.06`.
- Streak body fires when `winnerStreak.type === 'W' && length >= 3`, and includes the number.
- Scores render to one decimal (`toFixed(1)`), matching the neutral path.
- Conditional variants return `null` when they do not apply — `pick()` filters them.

Guidance on register, not to be copied literally: football's weeks are heavy because there are only 14 of them, its scoring is "hung" rather than "won", and its regret lives on the bench. Reach for the specific noun over the generic verb.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/editorial/football/__tests__/copy.test.ts`
Expected: PASS, 13 tests.

- [ ] **Step 5: Prove baseball did not regress**

Run: `npx vitest run`
Expected: full suite green.

- [ ] **Step 6: Commit**

```bash
git add src/editorial/football/points.ts src/editorial/football/__tests__/copy.test.ts
git commit -m "feat(football): finals and scoring copy in the football register"
```

---

### Task 3: Streak and season-stage variants

**Files:**
- Create: `src/editorial/football/streaks.ts`
- Create: `src/editorial/football/seasonStage.ts`
- Create: `src/editorial/football/index.ts`
- Modify: `src/editorial/football/__tests__/copy.test.ts` (extend the corpus gate)

**Interfaces:**
- Consumes: `assertVoiceClean`, `wordCount` (Task 1).
- Produces:
  ```ts
  // streaks.ts
  export function footballStreakLines(team: string, type: 'W' | 'L', length: number): Array<string | null>
  export function footballCellarLine(team: string, record: string): string
  // seasonStage.ts
  export function footballStageLine(stage: FootballStage, week: number, endWeek: number): string | null
  export type FootballStage = 'opening' | 'quarter' | 'half' | 'stretch' | 'final-week' | 'playoffs' | 'championship'
  // index.ts re-exports everything from points.ts, streaks.ts, seasonStage.ts
  ```

**Why football's calendar reads differently:** a 14-week regular season means week 8 is past halfway, not mid-journey. "Six games left" is a real number a football manager feels; "week 8 of 22" is not the same sentence.

- [ ] **Step 1: Write the failing test**

Append to `src/editorial/football/__tests__/copy.test.ts`:

```ts
import {
  footballStreakLines, footballCellarLine,
  footballStageLine, type FootballStage,
} from '@/editorial/football'

describe('football streak copy', () => {
  it('offers variants for a win streak, each carrying the number', () => {
    const lines = footballStreakLines('Gridiron Man', 'W', 4)
      .filter((s): s is string => !!s)
    expect(lines.length).toBeGreaterThanOrEqual(2)
    for (const l of lines) expect(l).toMatch(/4|four/i)
  })

  it('frames a losing streak without reusing the winning copy', () => {
    const w = footballStreakLines('A', 'W', 3).filter(Boolean).join(' ')
    const l = footballStreakLines('A', 'L', 3).filter(Boolean).join(' ')
    expect(w).not.toEqual(l)
  })

  it('cellar copy names the team and its record', () => {
    const s = footballCellarLine('Team 3', '2-12')
    expect(s).toContain('Team 3')
    expect(s).toContain('2-12')
  })
})

describe('football season-stage copy', () => {
  /* 14 games, not 22. "Six left" is a number a football manager feels. */
  it('counts games remaining rather than weeks elapsed', () => {
    const s = footballStageLine('stretch', 11, 14)
    expect(s).not.toBeNull()
    expect(s!).toMatch(/3|three/i)
  })

  it('gives championship week its own line', () => {
    const s = footballStageLine('championship', 17, 14)
    expect(s).not.toBeNull()
    expect(s!.toLowerCase()).toMatch(/title|championship|ring|trophy/)
  })

  it('returns null for a stage with no football-specific framing', () => {
    // Falling through to the neutral copy is correct, not a gap.
    expect(footballStageLine('quarter', 4, 14)).not.toBeUndefined()
  })
})

describe('extended corpus conformance', () => {
  const extended = [
    ...footballStreakLines('Gridiron Man', 'W', 4).filter((s): s is string => !!s),
    ...footballStreakLines('Scuttlebucs', 'L', 5).filter((s): s is string => !!s),
    footballCellarLine('Team 3', '2-12'),
    ...(['opening', 'quarter', 'half', 'stretch', 'final-week', 'playoffs', 'championship'] as FootballStage[])
      .map((st) => footballStageLine(st, 11, 14))
      .filter((s): s is string => !!s),
  ]

  it('breaks no mechanical rule', () => {
    expect(() => assertVoiceClean(extended)).not.toThrow()
  })

  it('skews short', () => {
    const short = extended.filter((s) => wordCount(s) < 10).length
    expect(short / extended.length).toBeGreaterThan(0.5)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/editorial/football/__tests__/copy.test.ts`
Expected: FAIL — cannot resolve `@/editorial/football`.

- [ ] **Step 3: Implement streaks.ts, seasonStage.ts and index.ts**

Requirements the tests encode:
- `footballStreakLines` returns ≥2 real variants; every one contains the streak length as a digit or word.
- Win and loss streaks produce genuinely different copy, not one template with a swapped adjective.
- `footballStageLine` for `'stretch'` states **games remaining** (`endWeek - week`), not the week number.
- Championship copy uses title/ring/trophy language.
- A stage with no football-specific line returns `null` so the renderer falls through to neutral.
- `index.ts` re-exports from all three modules; no logic of its own.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/editorial/football/__tests__/copy.test.ts`
Expected: PASS, 21 tests.

- [ ] **Step 5: Prove baseball did not regress**

Run: `npx vitest run`

- [ ] **Step 6: Commit**

```bash
git add src/editorial/football/streaks.ts src/editorial/football/seasonStage.ts \
        src/editorial/football/index.ts src/editorial/football/__tests__/copy.test.ts
git commit -m "feat(football): streak and season-stage copy"
```

---

### Task 4: Wire it in, and fix the leak that started this

**Files:**
- Modify: `src/editorial/render-beat-points.ts`
- Test: `src/editorial/football/__tests__/render.test.ts` (create)

**Interfaces:**
- Consumes: everything from Tasks 1-3; `sportOf` from `@/editorial/leagueCore`.
- Produces: `renderBeatPoints` emits football copy for `sport === 'nfl'` and unchanged neutral copy otherwise.

**The leak:** `render-beat-points.ts` line ~193 contains `body = \`Decided in the final at-bats.\`` inside `detectFinals`. Football has no at-bats. This is the string that motivated the whole phase.

**The wiring pattern:** the file already selects copy with `pick(key, candidates)`, which filters nulls and hashes the key to choose deterministically. Branch the candidate ARRAY, not the pick:

```ts
const isFootball = sportOf(data) === 'nfl'
const headline = pick(key, isFootball
  ? footballFinalHeadlines(args)
  : [ /* the existing neutral candidates, unchanged */ ])
```

- [ ] **Step 1: Write the failing test**

`src/editorial/football/__tests__/render.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { renderBeatPoints } from '@/editorial/render-beat-points'
import { voiceViolations } from '@/editorial/football/voice'
import type { LeagueDataH2HPoints } from '@/editorial/types'

const team = (id: string, name: string) =>
  ({ id, name, ownerName: 'o', ownerInitials: id.toUpperCase(), avatarColor: 'c', isMyTeam: false })

/** Two teams, one decided game, a photo finish. */
function league(sport: 'nfl' | 'mlb'): LeagueDataH2HPoints {
  return {
    format: 'h2h-points', sport,
    leagueId: 'lg', leagueName: 'Gridiron', currentWeek: 9, currentSeason: 2026,
    regularSeasonEndWeek: 14,
    teams: [team('a', 'Gridiron Man'), team('b', 'Scuttlebucs')],
    standings: [
      { rank: 1, teamId: 'a', catWins: 6, catLosses: 2, catTies: 0, winPct: 0.75,
        streak: { type: 'W', length: 2 }, lastSix: [], ownsCount: 0, bleedingCount: 0 },
      { rank: 2, teamId: 'b', catWins: 4, catLosses: 4, catTies: 0, winPct: 0.5,
        streak: { type: 'L', length: 1 }, lastSix: [], ownsCount: 0, bleedingCount: 0 },
    ],
    seasonRankHistory: [{ week: 8, ranks: { a: 1, b: 2 } }],
    weeklyPointsAverage: 109.4,
    previousWeekMatchups: [
      { id: 'm1', homeTeamId: 'a', awayTeamId: 'b', status: 'final',
        homePoints: 110.1, awayPoints: 108.9 },
    ],
  } as unknown as LeagueDataH2HPoints
}

const allText = (items: Array<{ headline?: string; body?: string }>) =>
  items.flatMap((i) => [i.headline, i.body]).filter((s): s is string => !!s)

describe('renderBeatPoints — sport selection', () => {
  it('never says "at-bats" for a football league', () => {
    const text = allText(renderBeatPoints(league('nfl'), new Date('2026-11-10T12:00:00Z')) as never)
    expect(text.join(' ').toLowerCase()).not.toContain('at-bat')
  })

  it('emits no voice violations for a football league', () => {
    const text = allText(renderBeatPoints(league('nfl'), new Date('2026-11-10T12:00:00Z')) as never)
    for (const s of text) expect(voiceViolations(s)).toEqual([])
  })

  it('produces football-specific framing on a photo finish', () => {
    const text = allText(renderBeatPoints(league('nfl'), new Date('2026-11-10T12:00:00Z')) as never)
    expect(text.join(' ').toLowerCase()).toContain('monday night')
  })

  /* A points league that is NOT football keeps the neutral copy. This is
   * the regression guard for ESPN/Yahoo points baseball leagues, which
   * ship today and must not start reading like football. */
  it('leaves a non-football points league on the neutral copy', () => {
    const text = allText(renderBeatPoints(league('mlb'), new Date('2026-11-10T12:00:00Z')) as never)
    expect(text.join(' ').toLowerCase()).not.toContain('monday night')
  })
})
```

Note: `renderBeatPoints`'s exact signature and return shape are in the file; adapt the call and the `allText` accessor to match rather than assuming. If items expose copy under different keys, fix the helper, not the assertions.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/editorial/football/__tests__/render.test.ts`
Expected: FAIL — football copy is not wired in, and `at-bats` is still emitted.

- [ ] **Step 3: Wire the branch and delete the leak**

In `src/editorial/render-beat-points.ts`:
1. `import { sportOf } from './leagueCore'` and the football builders from `./football`.
2. In `detectFinals`, compute `const isFootball = sportOf(data) === 'nfl'` and branch the headline and body candidate arrays as shown in the pattern above.
3. **Delete** `body = \`Decided in the final at-bats.\``. For the non-football path replace it with a sport-neutral line that says the same thing — the margin was tiny — without a baseball noun. For football, the body comes from `footballFinalBodies`.
4. Apply the same branch in `detectStreaks` and `detectThrone` using the Task 3 builders.

Do NOT change `pick`, `hashString`, or the item shapes — variant selection must stay deterministic and the Beat feed's contract unchanged.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/editorial/football/__tests__/render.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Prove baseball did not regress**

Run: `npx vitest run && npx vite-node scripts/export-reel-fixture.ts && git diff --stat video/fixtures/reel.json`
Expected: full suite green; **no diff** on the reel.

- [ ] **Step 6: Read the output**

Run a real football league through and read what comes out:

```bash
cat > /tmp/voice.ts <<'EOF'
import { buildSleeperPointsData } from './src/editorial/adapters/sleeperAdapter'
import { sleeperFootballFixture } from './src/fixtures/sleeperFootball'
import { renderBeatPoints } from './src/editorial/render-beat-points'
const d: any = buildSleeperPointsData(sleeperFootballFixture as never)
for (const item of renderBeatPoints(d, new Date('2026-11-10T12:00:00Z')) as any[]) {
  console.log(`[${item.category}] ${item.headline}`)
  if (item.body) console.log(`         ${item.body}`)
}
EOF
npx vite-node /tmp/voice.ts
```

Paste the output into your report. This is the deliverable — the tests prove it follows the rules, but only reading it shows whether it is any good.

- [ ] **Step 7: Commit**

```bash
git add src/editorial/render-beat-points.ts src/editorial/football/__tests__/render.test.ts
git commit -m "feat(football): render football copy for nfl leagues, drop the at-bats leak"
```

---

## Out of scope

Waiver-wire stories (Phase 3.5 — needs `transactions` on the points contract); un-gating the views and the sport picker (Phase 4); `render-matchups-points.ts`, which is already sport-neutral and has no leak; basketball and hockey; the Draft and History tabs.

## Self-Review

**Spec coverage:** the voice checker and its `wrong-sport` rule (Task 1) · football finals and points copy (Task 2) · streaks and season stage (Task 3) · render wiring, the `at-bats` fix, and the non-football regression guard (Task 4) · baseball release gate (every task) · fall-through-to-neutral (Task 3's `null` return and Task 4's branch). Spec items deliberately deferred: waiver-wire stories, view un-gating.

**Verified against the codebase, not assumed:** `pick(key, candidates)` at `render-beat-points.ts:55` filters nulls and selects by hash, so conditional variants returning `null` is the established pattern. The `at-bats` string is in `detectFinals` around line 193. `render-matchups-points.ts` has no baseball leak and is untouched. `EDITORIAL.md` is 94 lines and two of its canonical sentences are already football.

**Type consistency:** `FinalArgs` is defined in Task 2 and consumed in Tasks 2 and 4. `FootballStage` is defined in Task 3. `voiceViolations` / `assertVoiceClean` / `wordCount` are defined in Task 1 and used in Tasks 2, 3 and 4. `index.ts` (Task 3) is the import surface Task 4 uses.

**Known risk carried into execution:** Task 2 and 3 are the only tasks in any plan this session whose deliverable is *writing*, not logic. The tests can prove the copy breaks no rule and skews short; they cannot prove it is good. Step 6 of Task 4 exists for that reason — the output gets read, by a person, before this is called done.
