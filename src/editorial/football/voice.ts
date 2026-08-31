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
 *  cross-sport and are NOT listed.
 *
 *  Matched case-sensitively against the ORIGINAL string, lowercase only.
 *  Team names are Title Case throughout this codebase ("Bullpen
 *  Theology" is a canonical example team in EDITORIAL.md itself), so a
 *  capitalized "Bullpen" is a mascot name, not the narrative noun. Only
 *  the lowercase, mid-sentence usage ("the bullpen collapsed") is what
 *  the leak this checker guards against actually looks like. */
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
    // No 'i' flag, matched against `s` (not lowercased): see the note on
    // WRONG_SPORT above for why case sensitivity is load-bearing here.
    if (new RegExp(`\\b${w}\\b`).test(s)) {
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
