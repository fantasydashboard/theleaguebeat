/**
 * History Page — Editorial Variant Library
 *
 * Variant pool that powers the editorial moments on the History page:
 * the small-caps era eyebrow per champion-year card, the championship
 * narrative on each year card, the all-time #1 legacy hero on the
 * podium, the multi-year dynasty beats (hitting / pitching / punt),
 * the record-book Hall of Fame and Hall of Shame entries, the Tale
 * of the Tape rivalry prose (featured + procedural), and the small
 * career-stats footnote pills (longest dynasty / biggest blowout /
 * closest championship / most consistent / most volatile).
 *
 * History is a LOW-frequency surface — opened at the start of a
 * season, the end of a season, and the occasional retrospective
 * check-in. Lower per-kind variant counts than home.ts / swings.ts.
 * The prose gets stared at, so the editorial craft is tight: every
 * sentence anchored to a number, every era label specific to the
 * shape of that year.
 *
 * Templates are functional — each receives a HistoryContext and
 * returns a string (or null/undefined for a self-veto). The
 * renderer filters out vetoes and picks at random from the
 * survivors. Public entry point: `renderHistory(kind, ctx)`.
 *
 * Voice rules: see EDITORIAL.md at the repo root. Re-read before
 * adding variants. Active voice, specific numbers, no em dashes,
 * no emojis, no second-person, sentence-length variety, last
 * names only after first mention.
 *
 * Variant count targets per kind:
 *   year-card-era-label:           6-8 per era hint (5 eras)
 *   year-card-headline:            18-22
 *   all-time-legacy-hero:          14-18
 *   dynasty-hitting / pitching:    12-15 each
 *   dynasty-punt-kings:            12-15
 *   record-book-fame / shame:      14-18 each
 *   rivalry-profile-marquee:       14-18
 *   rivalry-profile-procedural:    12-15
 *   footnote-* (5 kinds):          12-16 each
 *
 * Total: ~500-650 variants.
 */

/* ─────────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────────── */

export type HistoryKind =
  | 'year-card-era-label'         // small-caps eyebrow per champion year
  | 'year-card-headline'          // champion narrative per year card
  | 'all-time-legacy-hero'        // #1 team narrative
  | 'dynasty-hitting'             // multi-year hitting dominance
  | 'dynasty-pitching'            // multi-year pitching dominance
  | 'dynasty-punt-kings'          // multi-year punt strategy
  | 'record-book-fame'            // hall of fame entry
  | 'record-book-shame'           // hall of shame entry
  | 'rivalry-profile-marquee'     // featured rivalry (authored)
  | 'rivalry-profile-procedural'  // procedural rivalry copy (fallback)
  | 'footnote-longest-dynasty'    // career-stats footnote pills
  | 'footnote-biggest-blowout'
  | 'footnote-closest-championship'
  | 'footnote-most-consistent'
  | 'footnote-most-volatile'

/** Era hint used to shape the year-card eyebrow + headline. */
export type EraHint =
  | 'founding'   // year one / early years of the league
  | 'dynasty'    // a team is winning repeatedly
  | 'collapse'   // a dynasty just ended
  | 'reset'      // a new winner after a stale stretch
  | 'parity'     // tight races, no team owns the league

/** The era band for the all-time #1 team narrative. */
export type LegacyEra =
  | 'first-name-on-cup'    // first champion of the league
  | 'multi-time-winner'    // 2+ titles
  | 'consistent-contender' // top-4 most seasons

/** Record-book categories. The same kind handles many record types. */
export type RecordType =
  // Fame
  | 'most-wins'
  | 'highest-ppw'
  | 'best-season-pct'
  | 'most-categories'
  | 'most-championships'
  | 'longest-playoff-streak'
  | 'most-top-3-finishes'
  // Shame
  | 'worst-record'
  | 'most-losses'
  | 'lowest-ppw'
  | 'worst-season-pct'
  | 'most-cellar-finishes'
  | 'longest-losing-streak'
  | 'most-categories-lost'

export interface HistoryTeam {
  name: string         // team name as shown on the card / logo
  owner: string        // manager's last name (or handle)
}

export interface HistoryRecord {
  /** Pre-formatted category-record string, e.g. "144-72-9". */
  catRecord: string
  /** Optional unpacked numbers if a template wants them. */
  wins?: number
  losses?: number
  ties?: number
}

export interface HistoryRivalryStats {
  /** Pre-formatted all-time record, "5-2" or "5-2-1" from teamA's POV. */
  allTimeRecord: string
  /** Total meetings between the two teams. */
  meetings: number
  /** Net cat-margin in teamA's favor (positive = teamA ahead). */
  catMarginNet?: number
  /** Most lopsided cat-record in a single meeting, "9-0" / "8-1". */
  biggestBlowout?: string
  /** Tightest meeting cat-record, "5-5-1" / "5-4". */
  closestGame?: string
  /** Most recent winner (team name) and the year. */
  mostRecentWinner?: { name: string; year: number }
  /** Optional trend cue used by the procedural template. */
  trend?: 'one-sided' | 'split' | 'recent-reversal' | 'first-meeting'
}

export interface HistoryContext {
  /* ───── YEAR-CARD context ───── */
  year?: number
  /** Champion of the year described by this card. */
  championTeam?: HistoryTeam
  /** The team that lost in the final (or finished #2). */
  runnerUp?: HistoryTeam
  /** Worst team that year. */
  basement?: HistoryTeam
  /** Pre-formatted championship record, e.g. "144-72-9". */
  championRecord?: string
  /** Era hint set by data heuristics on the year. */
  era?: EraHint
  /** How many titles in a row this champion has (1 if no streak). */
  championStreakLen?: number
  /** Margin of championship victory in cats, "6-3" / "8-1". */
  championshipCatMargin?: string

  /* ───── ALL-TIME LEGACY HERO context ───── */
  legacyTeam?: HistoryTeam
  /** The single number that anchors the legacy card. */
  totalLegacyScore?: number
  titlesCount?: number
  playoffAppearances?: number
  seasonsPlayed?: number
  legacyEra?: LegacyEra
  /** Margin over the #2 legacy team. */
  legacyLeadMargin?: number

  /* ───── DYNASTY beats ───── */
  dynastyTeam?: HistoryTeam
  /** Cats owned across the dynasty span, e.g. ['HR','RBI']. */
  dynastyCats?: string[]
  /** Years dominated (length of run). */
  dynastyYears?: number
  /** First year of the dynasty span. */
  dynastyStartYear?: number
  /** Number of seasons finishing #1 in the cat. */
  topFinishes?: number
  /** Seasons covered by the comparison (e.g., 5 — "in 4 of 5"). */
  seasonsConsidered?: number
  /** For punt-kings: the punted cat, e.g. 'SV'. */
  puntedCat?: string
  /** For punt-kings: how many cats they win as a result. */
  puntedAltWins?: number

  /* ───── RECORD BOOK context ───── */
  recordType?: RecordType
  recordTeam?: HistoryTeam
  /** Pre-formatted record value, e.g. "78 wins" / "118.4 PPW" / "22-82". */
  recordValue?: string
  /** Optional raw numeric used by conditional templates. */
  recordNumber?: number
  /** Year (or year-span) that the record was set. */
  recordYear?: number
  recordYearSpan?: string  // "2024-2026" for multi-year records
  /** Margin over the next team (for fame) / below it (for shame). */
  recordMargin?: number

  /* ───── RIVALRY context ───── */
  rivalryTeamA?: HistoryTeam
  rivalryTeamB?: HistoryTeam
  rivalry?: HistoryRivalryStats
  /** Optional authored narrative bullet for marquee rivalries. */
  rivalryNotable?: string

  /* ───── FOOTNOTE context ───── */
  footnoteTeam?: HistoryTeam
  /** Pre-formatted footnote value, "2 straight in 2024-2025" / "184 PF differential". */
  footnoteValue?: string
  /** Optional second team referenced (e.g. the team blown out). */
  footnoteOpponent?: HistoryTeam
  /** Year(s) anchor. */
  footnoteYear?: number
  footnoteYearSpan?: string
}

/** A single variant function. Returns null/undefined to self-veto. */
export type VariantFn = (ctx: HistoryContext) => string | null | undefined

export interface HistoryTemplate {
  kind: HistoryKind
  eyebrows: VariantFn[]
  headlines: VariantFn[]
  bodies: VariantFn[]
}

/* ─────────────────────────────────────────────────────────────────
   SYNONYM DICTIONARIES (string pools used inside templates)
───────────────────────────────────────────────────────────────── */

const SYN = {
  TOOK_THE_CUP: [
    'took the cup',
    'took the title',
    'lifted the cup',
    'walked away with it',
    'closed it out',
    'sealed it',
    'finished the job',
  ],
  REIGNED: [
    'reigned',
    'held the throne',
    'owned the league',
    'ran the league',
    'sat on top',
    'wore the crown',
  ],
  OWNS: [
    'owns',
    'holds',
    'runs',
    'leads',
    'controls',
    'has run',
  ],
  CARRIED: [
    'carried',
    'paced',
    'fronted',
    'anchored',
    'led the way for',
  ],
  COLLAPSED: [
    'collapsed',
    'cratered',
    'gave it back',
    'cracked',
    'unraveled',
    'fell apart',
  ],
  BLEEDS: [
    'bleeds',
    'leaks',
    'gives up',
    'punts',
    'ignores',
  ],
  PUNTED: [
    'punted',
    'zeroed out',
    'walked away from',
    'crossed off',
    'ignored',
    'left blank',
  ],
  DEFINITIVE: [
    'definitively',
    'cleanly',
    'outright',
    'no contest',
    'and it is not close',
  ],
  HISTORIC: [
    'historic',
    'a record',
    'a league first',
    'a benchmark',
    'a marker',
  ],
  ROUGH: [
    'rough',
    'ugly',
    'a stretch to forget',
    'a tough sit',
    'one to skip past',
  ],
  RIVAL_VERBS_OWN: [
    'has owned',
    'has run',
    'has held',
    'has had the number of',
    'has answered',
  ],
  RIVAL_VERBS_SPLIT: [
    'has traded blows with',
    'has gone back and forth with',
    'has split with',
    'has matched',
  ],
  CLOSE: [
    'tight',
    'thin',
    'a one-cat fight',
    'inches apart',
    'decided late',
  ],
  STRATEGY: [
    'strategy',
    'plan',
    'roster build',
    'approach',
  ],
}

/* Pick a random variant from a synonym pool. */
function pick<T>(pool: readonly T[]): T {
  return pool[Math.floor(Math.random() * pool.length)]
}

/* Capitalize the first letter of a string. */
function cap(s: string): string {
  if (!s) return s
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/* Pluralize helper */
const plural = (n: number, one: string, many: string = one + 's') =>
  `${n} ${n === 1 ? one : many}`

/* Format a cat list for prose. ['HR','RBI'] -> "HR and RBI". */
function catList(cats: string[] | undefined): string {
  if (!cats || cats.length === 0) return ''
  if (cats.length === 1) return cats[0]
  if (cats.length === 2) return `${cats[0]} and ${cats[1]}`
  return `${cats.slice(0, -1).join(', ')}, and ${cats[cats.length - 1]}`
}

/* Record-type bucket helpers (used by record-book templates). */
function isCareerCountRecord(t: RecordType | undefined): boolean {
  return t === 'most-wins' || t === 'most-losses' ||
         t === 'most-championships' || t === 'most-top-3-finishes' ||
         t === 'most-cellar-finishes'
}
function isRateRecord(t: RecordType | undefined): boolean {
  return t === 'highest-ppw' || t === 'lowest-ppw' ||
         t === 'best-season-pct' || t === 'worst-season-pct'
}
function isStreakRecord(t: RecordType | undefined): boolean {
  return t === 'longest-playoff-streak' || t === 'longest-losing-streak'
}

/* ─────────────────────────────────────────────────────────────────
   KIND: YEAR-CARD-ERA-LABEL
   Small-caps eyebrow per champion-year card. Era-aware. Short.
   Total pool ~32. The renderer picks an era-matching variant.
───────────────────────────────────────────────────────────────── */

const YEAR_CARD_ERA_LABEL: HistoryTemplate = {
  kind: 'year-card-era-label',
  eyebrows: [],
  headlines: [
    /* ───── FOUNDING (6) ───── */
    (ctx) => ctx.era === 'founding' ? 'THE FOUNDING' : null,
    (ctx) => ctx.era === 'founding' ? 'YEAR ONE' : null,
    (ctx) => ctx.era === 'founding' ? 'THE BEGINNING' : null,
    (ctx) => ctx.era === 'founding' ? 'FIRST NAME ON THE CUP' : null,
    (ctx) => ctx.era === 'founding' ? 'OPENING CHAPTER' : null,
    (ctx) => ctx.era === 'founding' ? 'WHERE IT STARTED' : null,

    /* ───── DYNASTY (7) ───── */
    (ctx) => ctx.era === 'dynasty' ? 'THE DYNASTY YEARS' : null,
    (ctx) => ctx.era === 'dynasty' ? 'THE THRONE HELD' : null,
    (ctx) => ctx.era === 'dynasty' && (ctx.championStreakLen ?? 0) === 2 ? 'BACK-TO-BACK' : null,
    (ctx) => ctx.era === 'dynasty' && (ctx.championStreakLen ?? 0) >= 3 ? 'THREE-PEAT' : null,
    (ctx) => ctx.era === 'dynasty' ? 'THE THRONE STAYED PUT' : null,
    (ctx) => ctx.era === 'dynasty' ? 'REPEAT REIGN' : null,
    (ctx) => ctx.era === 'dynasty' ? 'STILL ON TOP' : null,

    /* ───── COLLAPSE (6) ───── */
    (ctx) => ctx.era === 'collapse' ? 'THE COLLAPSE' : null,
    (ctx) => ctx.era === 'collapse' ? 'THE FALL' : null,
    (ctx) => ctx.era === 'collapse' ? 'DYNASTY ENDED' : null,
    (ctx) => ctx.era === 'collapse' ? 'THE THRONE FELL' : null,
    (ctx) => ctx.era === 'collapse' ? 'CHANGING OF THE GUARD' : null,
    (ctx) => ctx.era === 'collapse' ? 'THE REIGN BROKE' : null,

    /* ───── RESET (6) ───── */
    (ctx) => ctx.era === 'reset' ? 'THE RESET' : null,
    (ctx) => ctx.era === 'reset' ? 'NEW BLOOD' : null,
    (ctx) => ctx.era === 'reset' ? 'OPEN FIELD' : null,
    (ctx) => ctx.era === 'reset' ? 'A NEW NAME' : null,
    (ctx) => ctx.era === 'reset' ? 'THE FIELD OPENED' : null,
    (ctx) => ctx.era === 'reset' ? 'FRESH CROWN' : null,

    /* ───── PARITY (7) ───── */
    (ctx) => ctx.era === 'parity' ? 'THE PARITY YEARS' : null,
    (ctx) => ctx.era === 'parity' ? "ANYONE'S CUP" : null,
    (ctx) => ctx.era === 'parity' ? 'TIGHT RACES' : null,
    (ctx) => ctx.era === 'parity' ? 'THE WIDE-OPEN FIELD' : null,
    (ctx) => ctx.era === 'parity' ? 'NO CLEAR FAVORITE' : null,
    (ctx) => ctx.era === 'parity' ? 'EVERYONE IN' : null,
    (ctx) => ctx.era === 'parity' ? 'A SCRAMBLE TO THE TOP' : null,

    /* ───── UNTYPED FALLBACK (2) ───── */
    () => 'CHAMPIONS',
    () => 'TITLE WON',
  ],
  bodies: [],
}

/* ─────────────────────────────────────────────────────────────────
   KIND: YEAR-CARD-HEADLINE
   Champion-prose per year card. Confident, retrospective. Slot in the
   record + runner-up where it earns it.
───────────────────────────────────────────────────────────────── */

const YEAR_CARD_HEADLINE: HistoryTemplate = {
  kind: 'year-card-headline',
  eyebrows: [],
  headlines: [
    /* Champion-led, no streak */
    (ctx) => ctx.championTeam ? `${ctx.championTeam.name} ${pick(SYN.TOOK_THE_CUP)}.` : null,
    (ctx) => ctx.championTeam ? `${ctx.championTeam.name} won it.` : null,
    (ctx) => ctx.championTeam ? `${ctx.championTeam.name} ${pick(SYN.REIGNED)}.` : null,
    (ctx) => ctx.championTeam && ctx.championRecord
      ? `${ctx.championTeam.name}. ${ctx.championRecord}. Done.`
      : null,

    /* Streak-aware (back-to-back, three-peat) */
    (ctx) => (ctx.championStreakLen ?? 0) === 2 && ctx.championTeam
      ? `${ctx.championTeam.name} back-to-back.`
      : null,
    (ctx) => (ctx.championStreakLen ?? 0) === 2 && ctx.championTeam
      ? `${ctx.championTeam.name} did it twice in a row.`
      : null,
    (ctx) => (ctx.championStreakLen ?? 0) >= 3 && ctx.championTeam
      ? `${ctx.championTeam.name}: ${ctx.championStreakLen} straight.`
      : null,
    (ctx) => (ctx.championStreakLen ?? 0) >= 3 && ctx.championTeam
      ? `Three-peat for ${ctx.championTeam.name}.`
      : null,

    /* Record-anchored */
    (ctx) => ctx.championTeam && ctx.championRecord
      ? `${ctx.championRecord}. ${ctx.championTeam.name} closed the year.`
      : null,
    (ctx) => ctx.championTeam && ctx.championRecord
      ? `${ctx.championTeam.name} finished ${ctx.championRecord}. Nobody else came close.`
      : null,

    /* Runner-up-aware */
    (ctx) => ctx.championTeam && ctx.runnerUp
      ? `${ctx.championTeam.name} beat ${ctx.runnerUp.name} in the final.`
      : null,
    (ctx) => ctx.championTeam && ctx.runnerUp && ctx.championshipCatMargin
      ? `${ctx.championTeam.name} over ${ctx.runnerUp.name}, ${ctx.championshipCatMargin}.`
      : null,
    (ctx) => ctx.championTeam && ctx.runnerUp
      ? `${ctx.runnerUp.name} pushed it. ${ctx.championTeam.name} closed it.`
      : null,

    /* Era-flavored champion lines */
    (ctx) => ctx.era === 'founding' && ctx.championTeam
      ? `${ctx.championTeam.name}: first name on the cup.`
      : null,
    (ctx) => ctx.era === 'dynasty' && ctx.championTeam
      ? `${ctx.championTeam.name} kept the throne.`
      : null,
    (ctx) => ctx.era === 'collapse' && ctx.championTeam
      ? `${ctx.championTeam.name} ended the dynasty.`
      : null,
    (ctx) => ctx.era === 'reset' && ctx.championTeam
      ? `${ctx.championTeam.name} took the open throne.`
      : null,
    (ctx) => ctx.era === 'parity' && ctx.championTeam
      ? `${ctx.championTeam.name} won the scramble.`
      : null,

    /* Two-fragment punch */
    (ctx) => ctx.championTeam && ctx.championshipCatMargin
      ? `${ctx.championTeam.name}. ${ctx.championshipCatMargin} in the final.`
      : null,
    (ctx) => ctx.championTeam
      ? `${ctx.championTeam.name} ${pick(SYN.TOOK_THE_CUP)}. The bracket fell their way.`
      : null,
    (ctx) => ctx.championTeam && ctx.runnerUp
      ? `Two paths. One cup. ${ctx.championTeam.name} took it.`
      : null,

    /* Owner-tagged (lighter alt) */
    (ctx) => ctx.championTeam && ctx.championTeam.owner
      ? `${ctx.championTeam.name}. ${ctx.championTeam.owner}'s ring.`
      : null,
  ],
  bodies: [
    /* Champion summary */
    (ctx) => ctx.championTeam && ctx.championRecord
      ? `${ctx.championTeam.name} closed the year ${ctx.championRecord}. The cup went home.`
      : null,
    (ctx) => ctx.championTeam && ctx.runnerUp
      ? `${ctx.championTeam.name} over ${ctx.runnerUp.name} in the final. ${ctx.championshipCatMargin ?? 'A clean close'}.`
      : null,
    (ctx) => ctx.championTeam
      ? `${ctx.championTeam.name} ${pick(SYN.REIGNED)} for the year. The record book caught up.`
      : null,

    /* Era-flavored bodies */
    (ctx) => ctx.era === 'founding' && ctx.championTeam
      ? `The first cup of the league. ${ctx.championTeam.name} ${pick(SYN.TOOK_THE_CUP)}. Name carved first.`
      : null,
    (ctx) => ctx.era === 'dynasty' && ctx.championTeam && ctx.championStreakLen
      ? `${ctx.championStreakLen} in a row. ${ctx.championTeam.name} ${pick(SYN.OWNS)} the era.`
      : null,
    (ctx) => ctx.era === 'collapse' && ctx.championTeam && ctx.runnerUp
      ? `The defending champ ${pick(SYN.COLLAPSED)}. ${ctx.championTeam.name} stepped through. ${ctx.runnerUp.name} pushed.`
      : null,
    (ctx) => ctx.era === 'reset' && ctx.championTeam
      ? `No clear favorite at the start. ${ctx.championTeam.name} put the year together.`
      : null,
    (ctx) => ctx.era === 'parity' && ctx.championTeam
      ? `The field was wide open. ${ctx.championTeam.name} held the late stretch.`
      : null,

    /* Basement-aware */
    (ctx) => ctx.championTeam && ctx.basement
      ? `${ctx.championTeam.name} on top. ${ctx.basement.name} in the cellar. Same league.`
      : null,
    (ctx) => ctx.basement
      ? `The basement belonged to ${ctx.basement.name}.`
      : null,

    /* Record + runner-up combo */
    (ctx) => ctx.championRecord && ctx.runnerUp && ctx.championTeam
      ? `${ctx.championRecord}. ${ctx.runnerUp.name} chased it all year. ${ctx.championTeam.name} held them off.`
      : null,
    (ctx) => ctx.championshipCatMargin && ctx.championTeam && ctx.runnerUp
      ? `Final cat-record ${ctx.championshipCatMargin}. ${ctx.championTeam.name} closed; ${ctx.runnerUp.name} ran out of room.`
      : null,

    /* Quiet-confidence fallback */
    (ctx) => ctx.championTeam
      ? `The year belonged to ${ctx.championTeam.name}.`
      : null,
    (ctx) => ctx.championTeam && ctx.championTeam.owner
      ? `${ctx.championTeam.name}. ${ctx.championTeam.owner} put the year together.`
      : null,
    (ctx) => ctx.year && ctx.championTeam
      ? `${ctx.year}: ${ctx.championTeam.name}.`
      : null,
  ],
}

/* ─────────────────────────────────────────────────────────────────
   KIND: ALL-TIME-LEGACY-HERO
   Monumental, weighty. The #1 legacy team on the podium card.
───────────────────────────────────────────────────────────────── */

const ALL_TIME_LEGACY_HERO: HistoryTemplate = {
  kind: 'all-time-legacy-hero',
  eyebrows: [
    () => 'ALL-TIME #1',
    () => 'THE LEGACY LEADER',
    () => 'TOP OF THE BOOK',
    () => 'LEAGUE BENCHMARK',
    () => 'THE GREATEST',
    () => 'THE LEGACY THRONE',
    (ctx) => (ctx.titlesCount ?? 0) >= 2 ? 'MULTI-TIME CHAMPION' : 'ALL-TIME #1',
    (ctx) => ctx.legacyEra === 'first-name-on-cup' ? 'FIRST NAME ON THE CUP' : 'ALL-TIME #1',
  ],
  headlines: [
    /* Score-led */
    (ctx) => ctx.legacyTeam && ctx.totalLegacyScore
      ? `${ctx.legacyTeam.name}: ${ctx.totalLegacyScore} legacy. Highest in league history.`
      : null,
    (ctx) => ctx.legacyTeam && ctx.totalLegacyScore
      ? `${ctx.totalLegacyScore}. The number that nobody else has touched.`
      : null,
    (ctx) => ctx.legacyTeam
      ? `${ctx.legacyTeam.name} sits on top of the all-time board.`
      : null,

    /* Titles + playoffs */
    (ctx) => ctx.legacyTeam && (ctx.titlesCount ?? 0) >= 2 && ctx.playoffAppearances
      ? `${ctx.legacyTeam.name}: ${plural(ctx.titlesCount!, 'title')}, ${plural(ctx.playoffAppearances, 'playoff run')}.`
      : null,
    (ctx) => ctx.legacyTeam && ctx.titlesCount === 1 && ctx.playoffAppearances
      ? `${ctx.legacyTeam.name}. One title, ${plural(ctx.playoffAppearances, 'playoff run')}, the rest is presence.`
      : null,
    (ctx) => ctx.legacyTeam && (ctx.titlesCount ?? 0) >= 3
      ? `${ctx.legacyTeam.name}: ${ctx.titlesCount} rings. Nobody else has more than ${(ctx.titlesCount ?? 0) - 1}.`
      : null,

    /* Era-flavored */
    (ctx) => ctx.legacyTeam && ctx.legacyEra === 'first-name-on-cup'
      ? `${ctx.legacyTeam.name}: first name on the cup, and still on top of the book.`
      : null,
    (ctx) => ctx.legacyTeam && ctx.legacyEra === 'multi-time-winner' && ctx.titlesCount
      ? `${ctx.legacyTeam.name} did it ${ctx.titlesCount} times. The math agrees.`
      : null,
    (ctx) => ctx.legacyTeam && ctx.legacyEra === 'consistent-contender' && ctx.playoffAppearances && ctx.seasonsPlayed
      ? `${ctx.legacyTeam.name}: ${ctx.playoffAppearances} playoff runs in ${ctx.seasonsPlayed} seasons. Presence over peak.`
      : null,

    /* Margin-led */
    (ctx) => ctx.legacyTeam && ctx.legacyLeadMargin && ctx.legacyLeadMargin >= 100
      ? `${ctx.legacyTeam.name} leads the book by ${ctx.legacyLeadMargin}. It is not a race.`
      : null,
    (ctx) => ctx.legacyTeam && ctx.legacyLeadMargin && ctx.legacyLeadMargin < 50
      ? `${ctx.legacyTeam.name} holds the top. The gap is ${ctx.legacyLeadMargin}.`
      : null,

    /* Owner-flavored */
    (ctx) => ctx.legacyTeam && ctx.legacyTeam.owner
      ? `${ctx.legacyTeam.name}. ${ctx.legacyTeam.owner} has the receipts.`
      : null,

    /* Quiet, definitive */
    (ctx) => ctx.legacyTeam
      ? `${ctx.legacyTeam.name}. The standard.`
      : null,
    (ctx) => ctx.legacyTeam
      ? `${ctx.legacyTeam.name} is the team the league measures against.`
      : null,
    (ctx) => ctx.legacyTeam && ctx.seasonsPlayed
      ? `${ctx.seasonsPlayed} seasons in. ${ctx.legacyTeam.name} has not been passed.`
      : null,
  ],
  bodies: [
    /* Number-anchored */
    (ctx) => ctx.legacyTeam && ctx.totalLegacyScore && ctx.titlesCount && ctx.playoffAppearances
      ? `${ctx.totalLegacyScore} legacy points. ${plural(ctx.titlesCount, 'title')}. ${plural(ctx.playoffAppearances, 'playoff appearance')}. The math is the case.`
      : null,
    (ctx) => ctx.legacyTeam && ctx.titlesCount && ctx.playoffAppearances && ctx.seasonsPlayed
      ? `${plural(ctx.titlesCount, 'ring')} in ${ctx.seasonsPlayed} seasons. ${ctx.playoffAppearances} playoff trips. ${ctx.legacyTeam.name} ${pick(SYN.OWNS)} the book.`
      : null,
    (ctx) => ctx.legacyTeam && ctx.legacyLeadMargin
      ? `${ctx.legacyLeadMargin} legacy points clear of #2. The lead has not been threatened.`
      : null,

    /* Era-flavored */
    (ctx) => ctx.legacyTeam && ctx.legacyEra === 'first-name-on-cup'
      ? `Won the first cup the league ever handed out. Has not stopped showing up since.`
      : null,
    (ctx) => ctx.legacyTeam && ctx.legacyEra === 'multi-time-winner' && ctx.titlesCount
      ? `${ctx.titlesCount} championships. The bench in the trophy room is full.`
      : null,
    (ctx) => ctx.legacyTeam && ctx.legacyEra === 'consistent-contender' && ctx.playoffAppearances && ctx.seasonsPlayed
      ? `${ctx.playoffAppearances} playoff runs in ${ctx.seasonsPlayed} seasons. The team the bracket has to go through.`
      : null,

    /* Owner-flavored */
    (ctx) => ctx.legacyTeam && ctx.legacyTeam.owner
      ? `${ctx.legacyTeam.owner} has been at the top of the conversation for years. The record agrees.`
      : null,

    /* Quiet, weighty */
    (ctx) => ctx.legacyTeam
      ? `${ctx.legacyTeam.name} is the answer when somebody asks who is the best.`
      : null,
    (ctx) => ctx.legacyTeam && ctx.titlesCount && ctx.seasonsPlayed
      ? `${ctx.titlesCount}-for-${ctx.seasonsPlayed} on title runs. The rest of the league is reaching.`
      : null,
    (ctx) => ctx.legacyTeam
      ? `Sits on top of every all-time table that matters.`
      : null,

    /* Definitive close */
    (ctx) => ctx.legacyTeam
      ? `${ctx.legacyTeam.name}. The standard the league is chasing.`
      : null,
    (ctx) => ctx.legacyTeam
      ? `The room knows who the alpha is. The book confirms it.`
      : null,
  ],
}

/* ─────────────────────────────────────────────────────────────────
   KIND: DYNASTY-HITTING
   Multi-year hitting dominance. Ownership-over-time framing.
───────────────────────────────────────────────────────────────── */

const DYNASTY_HITTING: HistoryTemplate = {
  kind: 'dynasty-hitting',
  eyebrows: [
    () => 'HITTING DYNASTY',
    () => 'THE POWER THRONE',
    () => 'BAT KINGS',
    () => 'OWNED THE BAT CATS',
    () => 'STILL THE POWER',
    () => 'MULTI-YEAR POWER',
    (ctx) => (ctx.dynastyYears ?? 0) >= 4 ? 'FOUR-YEAR REIGN' : 'HITTING DYNASTY',
    (ctx) => (ctx.dynastyYears ?? 0) >= 5 ? 'FIVE-YEAR REIGN' : 'HITTING DYNASTY',
  ],
  headlines: [
    /* Cat + years */
    (ctx) => ctx.dynastyTeam && ctx.dynastyCats && ctx.dynastyYears
      ? `${ctx.dynastyTeam.name} ${pick(SYN.OWNS)} ${catList(ctx.dynastyCats)} for ${plural(ctx.dynastyYears, 'year')} running.`
      : null,
    (ctx) => ctx.dynastyTeam && ctx.dynastyCats && ctx.dynastyYears
      ? `${ctx.dynastyYears} years of ${catList(ctx.dynastyCats)}. ${ctx.dynastyTeam.name}.`
      : null,

    /* Top-finish framed */
    (ctx) => ctx.dynastyTeam && ctx.dynastyCats && ctx.topFinishes && ctx.seasonsConsidered
      ? `${ctx.dynastyTeam.name} finished #1 in ${catList(ctx.dynastyCats)} in ${ctx.topFinishes} of the last ${plural(ctx.seasonsConsidered, 'season')}.`
      : null,
    (ctx) => ctx.dynastyTeam && ctx.dynastyCats && ctx.topFinishes && ctx.topFinishes >= 3
      ? `${ctx.topFinishes}-straight #1 in ${catList(ctx.dynastyCats)}. ${ctx.dynastyTeam.name}.`
      : null,

    /* Position of the cat */
    (ctx) => ctx.dynastyTeam && ctx.dynastyCats
      ? `${ctx.dynastyTeam.name}: the ${catList(ctx.dynastyCats)} address.`
      : null,
    (ctx) => ctx.dynastyTeam && ctx.dynastyCats
      ? `When the league talks ${catList(ctx.dynastyCats)}, it talks ${ctx.dynastyTeam.name}.`
      : null,

    /* Start-year anchored */
    (ctx) => ctx.dynastyTeam && ctx.dynastyCats && ctx.dynastyStartYear
      ? `${ctx.dynastyTeam.name} has ${pick(SYN.OWNS).replace(/^has /, '')} ${catList(ctx.dynastyCats)} since ${ctx.dynastyStartYear}.`
      : null,

    /* Quiet authority */
    (ctx) => ctx.dynastyTeam && ctx.dynastyCats
      ? `${ctx.dynastyTeam.name}. Power cats. End of conversation.`
      : null,
    (ctx) => ctx.dynastyTeam && ctx.dynastyYears && ctx.dynastyYears >= 5
      ? `${ctx.dynastyYears} straight years on top. ${ctx.dynastyTeam.name} ${pick(SYN.REIGNED)}.`
      : null,

    /* Owner-flavored */
    (ctx) => ctx.dynastyTeam && ctx.dynastyTeam.owner && ctx.dynastyCats
      ? `${ctx.dynastyTeam.owner} drafts power. ${ctx.dynastyTeam.name} delivers ${catList(ctx.dynastyCats)}.`
      : null,

    /* Cat-count expansion */
    (ctx) => ctx.dynastyTeam && ctx.dynastyCats && ctx.dynastyCats.length >= 2
      ? `${ctx.dynastyTeam.name} holds ${plural(ctx.dynastyCats.length, 'hitting cat')} across the era.`
      : null,
    (ctx) => ctx.dynastyTeam && ctx.dynastyCats && ctx.dynastyCats.length === 1
      ? `${ctx.dynastyCats[0]}. ${ctx.dynastyTeam.name}. Year after year.`
      : null,
  ],
  bodies: [
    /* Span-anchored */
    (ctx) => ctx.dynastyTeam && ctx.dynastyCats && ctx.dynastyYears && ctx.dynastyStartYear
      ? `${ctx.dynastyYears}-year run in ${catList(ctx.dynastyCats)} dating back to ${ctx.dynastyStartYear}. ${ctx.dynastyTeam.name} ${pick(SYN.OWNS)} the era.`
      : null,
    (ctx) => ctx.dynastyTeam && ctx.dynastyCats && ctx.topFinishes && ctx.seasonsConsidered
      ? `${ctx.topFinishes} of ${ctx.seasonsConsidered} seasons finishing first in ${catList(ctx.dynastyCats)}. The roster is built for it.`
      : null,

    /* Strategy framing */
    (ctx) => ctx.dynastyTeam && ctx.dynastyCats
      ? `Draft ${pick(SYN.STRATEGY)} centered on the bat. The results compound year over year.`
      : null,
    (ctx) => ctx.dynastyTeam && ctx.dynastyCats
      ? `Built the lineup around power. ${ctx.dynastyTeam.name} keeps cashing on it.`
      : null,

    /* Quiet authority */
    (ctx) => ctx.dynastyTeam && ctx.dynastyCats
      ? `${ctx.dynastyTeam.name} is the answer when the league asks who owns ${catList(ctx.dynastyCats)}.`
      : null,
    (ctx) => ctx.dynastyTeam && ctx.dynastyYears && ctx.dynastyYears >= 4
      ? `${ctx.dynastyYears} years on top of the cat. Nothing close to a challenger.`
      : null,

    /* Owner-flavored */
    (ctx) => ctx.dynastyTeam && ctx.dynastyTeam.owner && ctx.dynastyCats
      ? `${ctx.dynastyTeam.owner} drafts the bat early and refuses to let go. The cat ladder follows.`
      : null,

    /* Cat-count flavor */
    (ctx) => ctx.dynastyTeam && ctx.dynastyCats && ctx.dynastyCats.length >= 3
      ? `Three hitting cats inside the run. ${ctx.dynastyTeam.name} is not just power, it is the whole bat side.`
      : null,
    (ctx) => ctx.dynastyTeam && ctx.dynastyCats && ctx.dynastyCats.length === 1
      ? `One cat, owned. ${ctx.dynastyCats[0]} has belonged to ${ctx.dynastyTeam.name} since the start of the run.`
      : null,

    /* Closing weight */
    (ctx) => ctx.dynastyTeam
      ? `The era has a name on it. The name is ${ctx.dynastyTeam.name}.`
      : null,
    (ctx) => ctx.dynastyTeam && ctx.dynastyCats
      ? `${ctx.dynastyTeam.name} ${pick(SYN.OWNS)} the bat columns until somebody actually takes them.`
      : null,
  ],
}

/* ─────────────────────────────────────────────────────────────────
   KIND: DYNASTY-PITCHING
   Multi-year pitching dominance. Same shape as hitting, K/W/SV/ERA flavor.
───────────────────────────────────────────────────────────────── */

const DYNASTY_PITCHING: HistoryTemplate = {
  kind: 'dynasty-pitching',
  eyebrows: [
    () => 'PITCHING DYNASTY',
    () => 'THE ROTATION THRONE',
    () => 'ARMS KINGDOM',
    () => 'OWNED THE MOUND',
    () => 'STILL THE ARMS',
    () => 'MULTI-YEAR ARMS',
    (ctx) => (ctx.dynastyYears ?? 0) >= 4 ? 'FOUR-YEAR REIGN' : 'PITCHING DYNASTY',
    (ctx) => (ctx.dynastyYears ?? 0) >= 5 ? 'FIVE-YEAR REIGN' : 'PITCHING DYNASTY',
  ],
  headlines: [
    /* Cat + years */
    (ctx) => ctx.dynastyTeam && ctx.dynastyCats && ctx.dynastyYears
      ? `${ctx.dynastyTeam.name} ${pick(SYN.OWNS)} ${catList(ctx.dynastyCats)} for ${plural(ctx.dynastyYears, 'year')} running.`
      : null,
    (ctx) => ctx.dynastyTeam && ctx.dynastyCats && ctx.dynastyYears
      ? `${ctx.dynastyYears} years of mound work. ${ctx.dynastyTeam.name}.`
      : null,

    /* Top-finish framed */
    (ctx) => ctx.dynastyTeam && ctx.dynastyCats && ctx.topFinishes && ctx.seasonsConsidered
      ? `${ctx.dynastyTeam.name} finished #1 in ${catList(ctx.dynastyCats)} in ${ctx.topFinishes} of the last ${plural(ctx.seasonsConsidered, 'season')}.`
      : null,
    (ctx) => ctx.dynastyTeam && ctx.topFinishes && ctx.topFinishes >= 3 && ctx.dynastyCats
      ? `${ctx.topFinishes}-straight #1 in ${catList(ctx.dynastyCats)}. ${ctx.dynastyTeam.name}.`
      : null,

    /* Address-of */
    (ctx) => ctx.dynastyTeam && ctx.dynastyCats
      ? `${ctx.dynastyTeam.name}: the ${catList(ctx.dynastyCats)} address.`
      : null,
    (ctx) => ctx.dynastyTeam && ctx.dynastyCats
      ? `Want ${catList(ctx.dynastyCats)}? Go through ${ctx.dynastyTeam.name}.`
      : null,

    /* Bullpen / rotation flavor */
    (ctx) => ctx.dynastyTeam && ctx.dynastyCats && ctx.dynastyCats.includes('SV')
      ? `${ctx.dynastyTeam.name}: the bullpen runs the league.`
      : null,
    (ctx) => ctx.dynastyTeam && ctx.dynastyCats && ctx.dynastyCats.includes('K')
      ? `${ctx.dynastyTeam.name}: the K column has not moved in years.`
      : null,
    (ctx) => ctx.dynastyTeam && ctx.dynastyCats && (ctx.dynastyCats.includes('ERA') || ctx.dynastyCats.includes('WHIP'))
      ? `${ctx.dynastyTeam.name}: the ratios live there.`
      : null,

    /* Start-year + quiet */
    (ctx) => ctx.dynastyTeam && ctx.dynastyCats && ctx.dynastyStartYear
      ? `${ctx.dynastyTeam.name} has held ${catList(ctx.dynastyCats)} since ${ctx.dynastyStartYear}.`
      : null,
    (ctx) => ctx.dynastyTeam && ctx.dynastyYears && ctx.dynastyYears >= 5
      ? `${ctx.dynastyYears} straight seasons on top. ${ctx.dynastyTeam.name} ${pick(SYN.REIGNED)} on the mound.`
      : null,

    /* Owner-flavored */
    (ctx) => ctx.dynastyTeam && ctx.dynastyTeam.owner && ctx.dynastyCats
      ? `${ctx.dynastyTeam.owner} drafts the arms. ${ctx.dynastyTeam.name} delivers ${catList(ctx.dynastyCats)}.`
      : null,
  ],
  bodies: [
    /* Span-anchored */
    (ctx) => ctx.dynastyTeam && ctx.dynastyCats && ctx.dynastyYears && ctx.dynastyStartYear
      ? `${ctx.dynastyYears}-year run in ${catList(ctx.dynastyCats)} dating back to ${ctx.dynastyStartYear}. ${ctx.dynastyTeam.name} ${pick(SYN.OWNS)} the mound era.`
      : null,
    (ctx) => ctx.dynastyTeam && ctx.dynastyCats && ctx.topFinishes && ctx.seasonsConsidered
      ? `${ctx.topFinishes} of ${ctx.seasonsConsidered} seasons finishing first in ${catList(ctx.dynastyCats)}. The pitching plan is set.`
      : null,

    /* Cat-flavored bodies */
    (ctx) => ctx.dynastyTeam && ctx.dynastyCats && ctx.dynastyCats.includes('SV')
      ? `Closers stacked early every spring. The bullpen has not slipped in years.`
      : null,
    (ctx) => ctx.dynastyTeam && ctx.dynastyCats && ctx.dynastyCats.includes('K')
      ? `Punchout-first rotation. The K column belongs to ${ctx.dynastyTeam.name} until somebody takes it.`
      : null,
    (ctx) => ctx.dynastyTeam && ctx.dynastyCats && ctx.dynastyCats.includes('ERA')
      ? `Ratio discipline week to week. ${ctx.dynastyTeam.name} treats ERA like a strategy, not a stat.`
      : null,

    /* Strategy framing */
    (ctx) => ctx.dynastyTeam
      ? `Built the staff around the cats nobody else commits to. The result is the era.`
      : null,
    (ctx) => ctx.dynastyTeam && ctx.dynastyCats
      ? `When the league sorts by ${catList(ctx.dynastyCats)}, ${ctx.dynastyTeam.name} is at the top. Year after year.`
      : null,

    /* Owner-flavored */
    (ctx) => ctx.dynastyTeam && ctx.dynastyTeam.owner
      ? `${ctx.dynastyTeam.owner} treats the staff like the core of the roster. The standings agree.`
      : null,

    /* Quiet authority */
    (ctx) => ctx.dynastyTeam && ctx.dynastyYears && ctx.dynastyYears >= 4
      ? `${ctx.dynastyYears} straight on top of the pitching side. The challengers keep falling short.`
      : null,
    (ctx) => ctx.dynastyTeam
      ? `The arms era has a name. ${ctx.dynastyTeam.name}.`
      : null,
  ],
}

/* ─────────────────────────────────────────────────────────────────
   KIND: DYNASTY-PUNT-KINGS
   Strategy-acknowledgment. Repeated punt of a cat, winning elsewhere.
───────────────────────────────────────────────────────────────── */

const DYNASTY_PUNT_KINGS: HistoryTemplate = {
  kind: 'dynasty-punt-kings',
  eyebrows: [
    () => 'PUNT KINGS',
    () => 'STRATEGY HALL',
    () => 'BUILD-THE-OTHER-NINE',
    () => 'THE PUNT THRONE',
    () => 'MULTI-YEAR PUNT',
    () => 'PUNTED ON PURPOSE',
    (ctx) => (ctx.dynastyYears ?? 0) >= 4 ? 'FOUR-YEAR PUNT' : 'PUNT KINGS',
    (ctx) => (ctx.dynastyYears ?? 0) >= 5 ? 'FIVE-YEAR PUNT' : 'PUNT KINGS',
  ],
  headlines: [
    /* Cat + years */
    (ctx) => ctx.dynastyTeam && ctx.puntedCat && ctx.dynastyYears
      ? `${ctx.dynastyTeam.name} has ${pick(SYN.PUNTED)} ${ctx.puntedCat} for ${plural(ctx.dynastyYears, 'straight season')}.`
      : null,
    (ctx) => ctx.dynastyTeam && ctx.puntedCat && ctx.dynastyYears
      ? `${ctx.dynastyYears} years of zero ${ctx.puntedCat}. ${ctx.dynastyTeam.name}.`
      : null,

    /* Strategy framing */
    (ctx) => ctx.dynastyTeam && ctx.puntedCat
      ? `${ctx.dynastyTeam.name} ${pick(SYN.PUNTED)} ${ctx.puntedCat}. The ${pick(SYN.STRATEGY)} is still paying.`
      : null,
    (ctx) => ctx.dynastyTeam && ctx.puntedCat
      ? `${ctx.dynastyTeam.name}: punt ${ctx.puntedCat}, win the rest.`
      : null,

    /* Alt-wins */
    (ctx) => ctx.dynastyTeam && ctx.puntedCat && ctx.puntedAltWins
      ? `${ctx.dynastyTeam.name} ${pick(SYN.OWNS)} ${ctx.puntedAltWins} other cats. ${ctx.puntedCat} is the price.`
      : null,
    (ctx) => ctx.dynastyTeam && ctx.puntedAltWins && ctx.puntedAltWins >= 6
      ? `${ctx.dynastyTeam.name} runs ${ctx.puntedAltWins} cats. The one they skip is the receipt.`
      : null,

    /* Start-year */
    (ctx) => ctx.dynastyTeam && ctx.puntedCat && ctx.dynastyStartYear
      ? `${ctx.dynastyTeam.name} has been zero in ${ctx.puntedCat} since ${ctx.dynastyStartYear}. Still winning the league.`
      : null,

    /* Owner-flavored */
    (ctx) => ctx.dynastyTeam && ctx.dynastyTeam.owner && ctx.puntedCat
      ? `${ctx.dynastyTeam.owner} drafts a roster ${ctx.puntedCat} cannot live in. The other cats compound.`
      : null,

    /* Quiet authority */
    (ctx) => ctx.dynastyTeam && ctx.puntedCat
      ? `${ctx.dynastyTeam.name} ${pick(SYN.BLEEDS)} ${ctx.puntedCat}. ${pick(SYN.STRATEGY)}, not accident.`
      : null,
    (ctx) => ctx.dynastyTeam && ctx.puntedCat
      ? `${ctx.dynastyTeam.name}: 0 ${ctx.puntedCat}, every year. Still in the playoffs.`
      : null,

    /* Definitive */
    (ctx) => ctx.dynastyTeam && ctx.puntedCat
      ? `${cap(pick(SYN.PUNTED))} ${ctx.puntedCat}. ${ctx.dynastyTeam.name} keeps winning anyway.`
      : null,

    /* Stat-led */
    (ctx) => ctx.dynastyTeam && ctx.puntedCat && ctx.dynastyYears && ctx.puntedAltWins
      ? `${ctx.dynastyYears}-year punt of ${ctx.puntedCat}. ${ctx.puntedAltWins} cats won as a result.`
      : null,
  ],
  bodies: [
    /* Span-anchored */
    (ctx) => ctx.dynastyTeam && ctx.puntedCat && ctx.dynastyYears && ctx.dynastyStartYear
      ? `${ctx.dynastyYears}-year run of ignoring ${ctx.puntedCat} dating back to ${ctx.dynastyStartYear}. The rest of the roster pays for the skip.`
      : null,
    (ctx) => ctx.dynastyTeam && ctx.puntedCat && ctx.puntedAltWins && ctx.dynastyYears
      ? `${ctx.dynastyYears} seasons ${pick(SYN.PUNTED)} on ${ctx.puntedCat}. ${plural(ctx.puntedAltWins, 'category', 'categories')} won in return. Math approves.`
      : null,

    /* Strategy framing */
    (ctx) => ctx.dynastyTeam && ctx.puntedCat
      ? `Roster built without a single ${ctx.puntedCat} arm. The other nine cats absorb the budget.`
      : null,
    (ctx) => ctx.dynastyTeam && ctx.puntedCat
      ? `${ctx.dynastyTeam.name} treats ${ctx.puntedCat} as a tax. The other cats pay the bill.`
      : null,

    /* Owner-flavored */
    (ctx) => ctx.dynastyTeam && ctx.dynastyTeam.owner && ctx.puntedCat
      ? `${ctx.dynastyTeam.owner} drafts the rest first. ${ctx.puntedCat} never gets called.`
      : null,

    /* Outcome framing */
    (ctx) => ctx.dynastyTeam && ctx.puntedCat
      ? `${ctx.puntedCat} is a zero every week. The standings keep saying it works.`
      : null,
    (ctx) => ctx.dynastyTeam && ctx.puntedCat && ctx.puntedAltWins && ctx.puntedAltWins >= 6
      ? `${ctx.puntedAltWins} cats won most weeks. The punted column is the only one on the board.`
      : null,

    /* Quiet close */
    (ctx) => ctx.dynastyTeam && ctx.puntedCat
      ? `${ctx.dynastyTeam.name} ${pick(SYN.PUNTED)} ${ctx.puntedCat}. The league still has to beat them.`
      : null,
    (ctx) => ctx.dynastyTeam
      ? `The blueprint is on file. ${ctx.dynastyTeam.name} keeps running it.`
      : null,
    (ctx) => ctx.dynastyTeam && ctx.puntedCat
      ? `${cap(pick(SYN.STRATEGY))} ${pick(SYN.DEFINITIVE)}. ${ctx.dynastyTeam.name} skips ${ctx.puntedCat} and still cashes.`
      : null,
  ],
}

/* ─────────────────────────────────────────────────────────────────
   KIND: RECORD-BOOK-FAME
   Hall of Fame entry. Definitive, weighty. Per-record-type conditionals.
───────────────────────────────────────────────────────────────── */

const RECORD_BOOK_FAME: HistoryTemplate = {
  kind: 'record-book-fame',
  eyebrows: [
    () => 'HALL OF FAME',
    () => 'RECORD BOOK',
    () => 'LEAGUE RECORD',
    () => 'IN THE BOOK',
    () => 'CARVED IN',
    () => 'BENCHMARK',
    (ctx) => ctx.recordType === 'most-championships' ? 'MOST RINGS' : 'HALL OF FAME',
    (ctx) => ctx.recordType === 'most-wins' ? 'MOST CAREER WINS' : 'HALL OF FAME',
  ],
  headlines: [
    /* Generic record-anchored */
    (ctx) => ctx.recordTeam && ctx.recordValue
      ? `${ctx.recordValue}. ${ctx.recordTeam.name}.`
      : null,
    (ctx) => ctx.recordTeam && ctx.recordValue
      ? `${ctx.recordTeam.name}: ${ctx.recordValue}. Most in league history.`
      : null,
    (ctx) => ctx.recordTeam && ctx.recordValue
      ? `${ctx.recordValue}. Nobody else is close.`
      : null,

    /* Career-count record */
    (ctx) => isCareerCountRecord(ctx.recordType) && ctx.recordTeam && ctx.recordValue
      ? `${ctx.recordValue}. The record. ${ctx.recordTeam.name}.`
      : null,
    (ctx) => ctx.recordType === 'most-wins' && ctx.recordTeam && ctx.recordValue
      ? `${ctx.recordTeam.name}. ${ctx.recordValue} all-time wins. ${pick(SYN.HISTORIC)}.`
      : null,
    (ctx) => ctx.recordType === 'most-championships' && ctx.recordTeam && ctx.recordValue
      ? `${ctx.recordValue}. ${ctx.recordTeam.name} ${pick(SYN.OWNS)} the trophy case.`
      : null,
    (ctx) => ctx.recordType === 'most-top-3-finishes' && ctx.recordTeam && ctx.recordValue
      ? `${ctx.recordValue}. ${ctx.recordTeam.name} is always around the top.`
      : null,

    /* Rate record */
    (ctx) => isRateRecord(ctx.recordType) && ctx.recordTeam && ctx.recordValue
      ? `${ctx.recordValue}. The high-water mark. ${ctx.recordTeam.name}.`
      : null,
    (ctx) => ctx.recordType === 'highest-ppw' && ctx.recordTeam && ctx.recordValue
      ? `${ctx.recordValue} per week. Highest the league has seen.`
      : null,
    (ctx) => ctx.recordType === 'best-season-pct' && ctx.recordTeam && ctx.recordValue
      ? `${ctx.recordValue}. ${ctx.recordTeam.name}: best single-season pct on record.`
      : null,
    (ctx) => ctx.recordType === 'most-categories' && ctx.recordTeam && ctx.recordValue
      ? `${ctx.recordValue}. ${ctx.recordTeam.name} owned every column it touched.`
      : null,

    /* Streak record */
    (ctx) => isStreakRecord(ctx.recordType) && ctx.recordType === 'longest-playoff-streak' && ctx.recordTeam && ctx.recordValue
      ? `${ctx.recordValue}. ${ctx.recordTeam.name} did not miss.`
      : null,

    /* Year-anchored */
    (ctx) => ctx.recordTeam && ctx.recordValue && ctx.recordYear
      ? `${ctx.recordYear}: ${ctx.recordTeam.name} set the bar at ${ctx.recordValue}.`
      : null,
    (ctx) => ctx.recordTeam && ctx.recordValue && ctx.recordYearSpan
      ? `${ctx.recordYearSpan}. ${ctx.recordTeam.name}. ${ctx.recordValue}.`
      : null,

    /* Margin-led */
    (ctx) => ctx.recordTeam && ctx.recordValue && ctx.recordMargin && ctx.recordMargin >= 10
      ? `${ctx.recordValue}. ${ctx.recordMargin} clear of second.`
      : null,

    /* Quiet, definitive */
    (ctx) => ctx.recordTeam && ctx.recordValue
      ? `In the book. ${ctx.recordValue}. ${ctx.recordTeam.name}.`
      : null,
  ],
  bodies: [
    /* Generic */
    (ctx) => ctx.recordTeam && ctx.recordValue
      ? `${ctx.recordValue}. ${ctx.recordTeam.name} holds the record outright.`
      : null,
    (ctx) => ctx.recordTeam && ctx.recordValue && ctx.recordMargin
      ? `${ctx.recordValue}, with ${ctx.recordMargin} between them and the next team. The gap is the story.`
      : null,

    /* Career-count */
    (ctx) => ctx.recordType === 'most-wins' && ctx.recordTeam && ctx.recordValue
      ? `${ctx.recordValue} across every season the league has played. ${ctx.recordTeam.name} has been the constant.`
      : null,
    (ctx) => ctx.recordType === 'most-championships' && ctx.recordTeam && ctx.recordValue
      ? `${ctx.recordValue}. The room has one alpha and the trophy room agrees.`
      : null,
    (ctx) => ctx.recordType === 'most-top-3-finishes' && ctx.recordTeam && ctx.recordValue
      ? `${ctx.recordValue}. ${ctx.recordTeam.name} is in the conversation every year.`
      : null,

    /* Rate */
    (ctx) => ctx.recordType === 'highest-ppw' && ctx.recordTeam && ctx.recordValue
      ? `${ctx.recordValue} points per week. The kind of pace that defines a season.`
      : null,
    (ctx) => ctx.recordType === 'best-season-pct' && ctx.recordTeam && ctx.recordValue && ctx.recordYear
      ? `${ctx.recordYear} season at ${ctx.recordValue}. ${ctx.recordTeam.name} ran the calendar.`
      : null,
    (ctx) => ctx.recordType === 'most-categories' && ctx.recordTeam && ctx.recordValue
      ? `${ctx.recordValue}. ${ctx.recordTeam.name} took every column that mattered.`
      : null,

    /* Streak */
    (ctx) => ctx.recordType === 'longest-playoff-streak' && ctx.recordTeam && ctx.recordValue
      ? `${ctx.recordValue}. ${ctx.recordTeam.name} has not missed a postseason in the span.`
      : null,

    /* Year-anchored */
    (ctx) => ctx.recordTeam && ctx.recordValue && ctx.recordYear
      ? `Set ${ctx.recordYear}. Still standing. ${ctx.recordTeam.name}.`
      : null,
    (ctx) => ctx.recordTeam && ctx.recordValue && ctx.recordYearSpan
      ? `${ctx.recordYearSpan}. ${ctx.recordValue}. The record holds.`
      : null,

    /* Owner-flavored */
    (ctx) => ctx.recordTeam && ctx.recordTeam.owner && ctx.recordValue
      ? `${ctx.recordTeam.owner} has been at this since the league started. ${ctx.recordValue} is the bookmark.`
      : null,

    /* Quiet, definitive */
    (ctx) => ctx.recordTeam
      ? `${ctx.recordTeam.name} is the answer until somebody breaks it.`
      : null,
    (ctx) => ctx.recordValue
      ? `${ctx.recordValue}. The number that anchors the page.`
      : null,
  ],
}

/* ─────────────────────────────────────────────────────────────────
   KIND: RECORD-BOOK-SHAME
   Hall of Shame entry. Blunt-but-not-mean.
───────────────────────────────────────────────────────────────── */

const RECORD_BOOK_SHAME: HistoryTemplate = {
  kind: 'record-book-shame',
  eyebrows: [
    () => 'HALL OF SHAME',
    () => 'THE BOOK REMEMBERS',
    () => 'BASEMENT WING',
    () => 'BOTTOM OF THE BOOK',
    () => 'THE OTHER RECORD',
    () => 'CARVED IN, ROUGH SIDE',
    (ctx) => ctx.recordType === 'worst-record' ? 'WORST CAREER MARK' : 'HALL OF SHAME',
    (ctx) => ctx.recordType === 'most-cellar-finishes' ? 'BASEMENT REGULARS' : 'HALL OF SHAME',
  ],
  headlines: [
    /* Generic */
    (ctx) => ctx.recordTeam && ctx.recordValue
      ? `${ctx.recordValue}. ${ctx.recordTeam.name}. The basement is named after them.`
      : null,
    (ctx) => ctx.recordTeam && ctx.recordValue
      ? `${ctx.recordTeam.name}: ${ctx.recordValue}. Worst on record.`
      : null,
    (ctx) => ctx.recordTeam && ctx.recordValue
      ? `${ctx.recordValue}. The book remembers.`
      : null,

    /* Career-count shame */
    (ctx) => ctx.recordType === 'worst-record' && ctx.recordTeam && ctx.recordValue
      ? `${ctx.recordValue} lifetime mark. ${ctx.recordTeam.name}.`
      : null,
    (ctx) => ctx.recordType === 'most-losses' && ctx.recordTeam && ctx.recordValue
      ? `${ctx.recordValue}. Most losses the league has logged.`
      : null,
    (ctx) => ctx.recordType === 'most-cellar-finishes' && ctx.recordTeam && ctx.recordValue
      ? `${ctx.recordValue}. ${ctx.recordTeam.name} ${pick(SYN.OWNS)} the basement.`
      : null,

    /* Rate shame */
    (ctx) => ctx.recordType === 'lowest-ppw' && ctx.recordTeam && ctx.recordValue
      ? `${ctx.recordValue} per week. The floor of the era.`
      : null,
    (ctx) => ctx.recordType === 'worst-season-pct' && ctx.recordTeam && ctx.recordValue
      ? `${ctx.recordValue}. ${ctx.recordTeam.name}: ${pick(SYN.ROUGH)} season on record.`
      : null,
    (ctx) => ctx.recordType === 'most-categories-lost' && ctx.recordTeam && ctx.recordValue
      ? `${ctx.recordValue}. Most cats given back in a season.`
      : null,

    /* Streak shame */
    (ctx) => ctx.recordType === 'longest-losing-streak' && ctx.recordTeam && ctx.recordValue
      ? `${ctx.recordValue}. ${ctx.recordTeam.name} could not stop the bleed.`
      : null,

    /* Year-anchored */
    (ctx) => ctx.recordTeam && ctx.recordValue && ctx.recordYear
      ? `${ctx.recordYear}: ${ctx.recordTeam.name}. ${ctx.recordValue}. ${cap(pick(SYN.ROUGH))}.`
      : null,
    (ctx) => ctx.recordTeam && ctx.recordValue && ctx.recordYearSpan
      ? `${ctx.recordYearSpan}. ${ctx.recordValue}. Still the floor.`
      : null,

    /* Quiet, blunt */
    (ctx) => ctx.recordTeam && ctx.recordValue
      ? `${ctx.recordValue}. The book has receipts.`
      : null,
    (ctx) => ctx.recordTeam
      ? `${ctx.recordTeam.name}: the floor of the era.`
      : null,
    (ctx) => ctx.recordTeam && ctx.recordValue
      ? `${ctx.recordValue}. The basement has a name.`
      : null,
  ],
  bodies: [
    /* Generic */
    (ctx) => ctx.recordTeam && ctx.recordValue
      ? `${ctx.recordValue}. ${ctx.recordTeam.name} ${pick(SYN.OWNS)} the bottom of the table outright.`
      : null,
    (ctx) => ctx.recordTeam && ctx.recordValue && ctx.recordMargin
      ? `${ctx.recordValue}, with ${ctx.recordMargin} between them and the next-worst. The gap tells the story.`
      : null,

    /* Career-count */
    (ctx) => ctx.recordType === 'worst-record' && ctx.recordTeam && ctx.recordValue
      ? `${ctx.recordValue} lifetime. The basement is named after them.`
      : null,
    (ctx) => ctx.recordType === 'most-losses' && ctx.recordTeam && ctx.recordValue
      ? `${ctx.recordValue}. Every season has added to the pile.`
      : null,
    (ctx) => ctx.recordType === 'most-cellar-finishes' && ctx.recordTeam && ctx.recordValue
      ? `${ctx.recordValue}. The cellar is the address.`
      : null,

    /* Rate */
    (ctx) => ctx.recordType === 'lowest-ppw' && ctx.recordTeam && ctx.recordValue
      ? `${ctx.recordValue} per week. The lowest scoring stretch the book has seen.`
      : null,
    (ctx) => ctx.recordType === 'worst-season-pct' && ctx.recordTeam && ctx.recordValue && ctx.recordYear
      ? `${ctx.recordYear} season at ${ctx.recordValue}. ${ctx.recordTeam.name} could not get out of the slide.`
      : null,
    (ctx) => ctx.recordType === 'most-categories-lost' && ctx.recordTeam && ctx.recordValue
      ? `${ctx.recordValue}. The cat ledger emptied out by mid-year.`
      : null,

    /* Streak */
    (ctx) => ctx.recordType === 'longest-losing-streak' && ctx.recordTeam && ctx.recordValue
      ? `${ctx.recordValue}. The slide ran a full month and change.`
      : null,

    /* Year-anchored */
    (ctx) => ctx.recordTeam && ctx.recordValue && ctx.recordYear
      ? `Logged ${ctx.recordYear}. Still the floor. ${ctx.recordTeam.name}.`
      : null,

    /* Owner-flavored, soft */
    (ctx) => ctx.recordTeam && ctx.recordTeam.owner && ctx.recordValue
      ? `${ctx.recordTeam.owner} took the punch. ${ctx.recordValue} is what the season produced.`
      : null,

    /* Quiet, definitive */
    (ctx) => ctx.recordTeam
      ? `${ctx.recordTeam.name} owns the line nobody wants.`
      : null,
    (ctx) => ctx.recordValue
      ? `${ctx.recordValue}. The number the page does not let go of.`
      : null,
    (ctx) => ctx.recordTeam
      ? `The book remembers. ${ctx.recordTeam.name} is in there.`
      : null,
  ],
}

/* ─────────────────────────────────────────────────────────────────
   KIND: RIVALRY-PROFILE-MARQUEE
   Featured Tale of the Tape — hand-picked pairings. Authored.
───────────────────────────────────────────────────────────────── */

const RIVALRY_PROFILE_MARQUEE: HistoryTemplate = {
  kind: 'rivalry-profile-marquee',
  eyebrows: [
    () => 'FEATURED RIVALRY',
    () => 'TALE OF THE TAPE',
    () => 'THE MARQUEE',
    () => 'HEAD-TO-HEAD',
    () => 'THE PAIRING',
    () => 'CIRCLE THE DATE',
    (ctx) => (ctx.rivalry?.meetings ?? 0) >= 7 ? 'LONG-RUNNING' : 'FEATURED RIVALRY',
    (ctx) => ctx.rivalry?.trend === 'one-sided' ? 'ONE-SIDED' : 'FEATURED RIVALRY',
  ],
  headlines: [
    /* Record-anchored */
    (ctx) => ctx.rivalryTeamA && ctx.rivalryTeamB && ctx.rivalry?.allTimeRecord
      ? `${ctx.rivalryTeamA.name} ${pick(SYN.RIVAL_VERBS_OWN)} this matchup. ${ctx.rivalry.allTimeRecord} all-time.`
      : null,
    (ctx) => ctx.rivalryTeamA && ctx.rivalryTeamB && ctx.rivalry?.allTimeRecord
      ? `${ctx.rivalry.allTimeRecord}. ${ctx.rivalryTeamA.name} over ${ctx.rivalryTeamB.name}.`
      : null,

    /* Trend-led */
    (ctx) => ctx.rivalry?.trend === 'one-sided' && ctx.rivalryTeamA && ctx.rivalryTeamB && ctx.rivalry.allTimeRecord
      ? `${ctx.rivalryTeamA.name} has owned ${ctx.rivalryTeamB.name}. ${ctx.rivalry.allTimeRecord}.`
      : null,
    (ctx) => ctx.rivalry?.trend === 'split' && ctx.rivalryTeamA && ctx.rivalryTeamB
      ? `${ctx.rivalryTeamA.name} and ${ctx.rivalryTeamB.name}: every meeting up for grabs.`
      : null,
    (ctx) => ctx.rivalry?.trend === 'recent-reversal' && ctx.rivalryTeamA && ctx.rivalryTeamB
      ? `${ctx.rivalryTeamA.name} has flipped the script on ${ctx.rivalryTeamB.name}.`
      : null,

    /* Meeting-count framed */
    (ctx) => ctx.rivalry?.meetings && ctx.rivalry.meetings >= 5 && ctx.rivalryTeamA && ctx.rivalryTeamB
      ? `${plural(ctx.rivalry.meetings, 'meeting')} between ${ctx.rivalryTeamA.name} and ${ctx.rivalryTeamB.name}. The book is thick.`
      : null,
    (ctx) => ctx.rivalry?.meetings && ctx.rivalry.meetings >= 7 && ctx.rivalryTeamA && ctx.rivalryTeamB
      ? `Seven-plus meetings. ${ctx.rivalryTeamA.name} versus ${ctx.rivalryTeamB.name} is league history.`
      : null,

    /* Blowout / closest game */
    (ctx) => ctx.rivalry?.biggestBlowout && ctx.rivalryTeamA && ctx.rivalryTeamB
      ? `${ctx.rivalryTeamA.name} over ${ctx.rivalryTeamB.name}, ${ctx.rivalry.biggestBlowout}. The worst night of the series.`
      : null,
    (ctx) => ctx.rivalry?.closestGame && ctx.rivalryTeamA && ctx.rivalryTeamB
      ? `${ctx.rivalry.closestGame} the closest meeting. Decided in the last cat.`
      : null,

    /* Most-recent flavor */
    (ctx) => ctx.rivalry?.mostRecentWinner && ctx.rivalry.mostRecentWinner.year
      ? `Last meeting (${ctx.rivalry.mostRecentWinner.year}) went to ${ctx.rivalry.mostRecentWinner.name}.`
      : null,

    /* Authored hook */
    (ctx) => ctx.rivalryNotable
      ? ctx.rivalryNotable
      : null,
    (ctx) => ctx.rivalryNotable && ctx.rivalryTeamA && ctx.rivalryTeamB
      ? `${ctx.rivalryTeamA.name} vs ${ctx.rivalryTeamB.name}. ${ctx.rivalryNotable}`
      : null,

    /* Quiet authority */
    (ctx) => ctx.rivalryTeamA && ctx.rivalryTeamB
      ? `${ctx.rivalryTeamA.name} and ${ctx.rivalryTeamB.name}: the matchup the league circles.`
      : null,
    (ctx) => ctx.rivalryTeamA && ctx.rivalryTeamB
      ? `${ctx.rivalryTeamA.name}. ${ctx.rivalryTeamB.name}. Always a fight.`
      : null,
  ],
  bodies: [
    /* Record-led */
    (ctx) => ctx.rivalry?.allTimeRecord && ctx.rivalry.meetings && ctx.rivalryTeamA && ctx.rivalryTeamB
      ? `${ctx.rivalry.allTimeRecord} across ${plural(ctx.rivalry.meetings, 'meeting')}. ${ctx.rivalryTeamA.name} has been the better side, but ${ctx.rivalryTeamB.name} keeps showing up.`
      : null,
    (ctx) => ctx.rivalry?.allTimeRecord && ctx.rivalryTeamA && ctx.rivalryTeamB
      ? `${ctx.rivalry.allTimeRecord}. ${ctx.rivalryTeamA.name} ${pick(SYN.RIVAL_VERBS_OWN)} the series; ${ctx.rivalryTeamB.name} ${pick(SYN.RIVAL_VERBS_SPLIT)} them in stretches.`
      : null,

    /* Trend-led */
    (ctx) => ctx.rivalry?.trend === 'one-sided' && ctx.rivalryTeamA && ctx.rivalryTeamB
      ? `One-sided in the record. ${ctx.rivalryTeamA.name} has answered every move ${ctx.rivalryTeamB.name} has made.`
      : null,
    (ctx) => ctx.rivalry?.trend === 'split' && ctx.rivalryTeamA && ctx.rivalryTeamB
      ? `Split down the middle. Whoever shows up Friday usually wins it.`
      : null,
    (ctx) => ctx.rivalry?.trend === 'recent-reversal' && ctx.rivalryTeamA && ctx.rivalryTeamB
      ? `The script flipped recently. ${ctx.rivalryTeamA.name} has taken the last meetings; ${ctx.rivalryTeamB.name} used to own the column.`
      : null,

    /* Closest / blowout flavor */
    (ctx) => ctx.rivalry?.closestGame && ctx.rivalry.biggestBlowout
      ? `Closest meeting: ${ctx.rivalry.closestGame}. Worst night: ${ctx.rivalry.biggestBlowout}. Range covers everything.`
      : null,
    (ctx) => ctx.rivalry?.biggestBlowout
      ? `The worst single result in the series ran ${ctx.rivalry.biggestBlowout}. Both rosters remember.`
      : null,

    /* Authored notable */
    (ctx) => ctx.rivalryNotable
      ? ctx.rivalryNotable
      : null,

    /* Quiet authority */
    (ctx) => ctx.rivalryTeamA && ctx.rivalryTeamB
      ? `The pairing the schedule writes itself around.`
      : null,
    (ctx) => ctx.rivalry?.meetings && ctx.rivalryTeamA && ctx.rivalryTeamB
      ? `${plural(ctx.rivalry.meetings, 'time')} they have met. Nobody else in the league has this much shared history.`
      : null,
    (ctx) => ctx.rivalryTeamA && ctx.rivalryTeamB
      ? `${ctx.rivalryTeamA.name} versus ${ctx.rivalryTeamB.name}. The group chat shows up every time.`
      : null,
    (ctx) => ctx.rivalry?.mostRecentWinner
      ? `Most recent meeting went to ${ctx.rivalry.mostRecentWinner.name}. The next one is already on the calendar.`
      : null,
  ],
}

/* ─────────────────────────────────────────────────────────────────
   KIND: RIVALRY-PROFILE-PROCEDURAL
   Procedural prose for unfeatured pairings. More clinical, still on-voice.
───────────────────────────────────────────────────────────────── */

const RIVALRY_PROFILE_PROCEDURAL: HistoryTemplate = {
  kind: 'rivalry-profile-procedural',
  eyebrows: [
    () => 'HEAD-TO-HEAD',
    () => 'SERIES NOTE',
    () => 'THE RECORD',
    () => 'PAIRING',
    () => 'CARD',
    () => 'PROFILE',
    (ctx) => ctx.rivalry?.trend === 'first-meeting' ? 'FIRST MEETING' : 'HEAD-TO-HEAD',
    (ctx) => (ctx.rivalry?.meetings ?? 0) === 0 ? 'NEW PAIRING' : 'HEAD-TO-HEAD',
  ],
  headlines: [
    /* Count-anchored */
    (ctx) => ctx.rivalry?.meetings && ctx.rivalry.meetings >= 2 && ctx.rivalry.allTimeRecord && ctx.rivalryTeamA && ctx.rivalryTeamB
      ? `${plural(ctx.rivalry.meetings, 'meeting')}. ${ctx.rivalry.allTimeRecord}. ${ctx.rivalryTeamA.name} ${pick(SYN.RIVAL_VERBS_OWN)}.`
      : null,
    (ctx) => ctx.rivalry?.meetings && ctx.rivalry.meetings >= 2 && ctx.rivalry.mostRecentWinner
      ? `${plural(ctx.rivalry.meetings, 'meeting')}. Last one went to ${ctx.rivalry.mostRecentWinner.name}.`
      : null,

    /* First meeting */
    (ctx) => ctx.rivalry?.trend === 'first-meeting' && ctx.rivalryTeamA && ctx.rivalryTeamB
      ? `First meeting between ${ctx.rivalryTeamA.name} and ${ctx.rivalryTeamB.name}. No history yet.`
      : null,
    (ctx) => ctx.rivalry?.meetings === 1 && ctx.rivalryTeamA && ctx.rivalryTeamB
      ? `One meeting on the books. ${ctx.rivalryTeamA.name} versus ${ctx.rivalryTeamB.name}.`
      : null,

    /* Trend-led */
    (ctx) => ctx.rivalry?.trend === 'split' && ctx.rivalry.allTimeRecord && ctx.rivalryTeamA && ctx.rivalryTeamB
      ? `${ctx.rivalry.allTimeRecord}. Even split, ${ctx.rivalryTeamA.name} and ${ctx.rivalryTeamB.name}.`
      : null,
    (ctx) => ctx.rivalry?.trend === 'one-sided' && ctx.rivalry.allTimeRecord && ctx.rivalryTeamA
      ? `${ctx.rivalry.allTimeRecord}. ${ctx.rivalryTeamA.name} has run the series.`
      : null,

    /* Margin / blowout */
    (ctx) => ctx.rivalry?.catMarginNet && ctx.rivalry.catMarginNet >= 6 && ctx.rivalryTeamA
      ? `${ctx.rivalryTeamA.name} carries a +${ctx.rivalry.catMarginNet} net-cat margin in the series.`
      : null,
    (ctx) => ctx.rivalry?.biggestBlowout
      ? `Biggest result on file: ${ctx.rivalry.biggestBlowout}.`
      : null,

    /* Closest */
    (ctx) => ctx.rivalry?.closestGame
      ? `Tightest meeting: ${ctx.rivalry.closestGame}.`
      : null,

    /* Quiet, clinical */
    (ctx) => ctx.rivalryTeamA && ctx.rivalryTeamB
      ? `${ctx.rivalryTeamA.name} and ${ctx.rivalryTeamB.name}. Series record on file.`
      : null,
    (ctx) => ctx.rivalry?.mostRecentWinner && ctx.rivalry.mostRecentWinner.year
      ? `Last on the books: ${ctx.rivalry.mostRecentWinner.year}, ${ctx.rivalry.mostRecentWinner.name}.`
      : null,
  ],
  bodies: [
    /* Record summary */
    (ctx) => ctx.rivalry?.allTimeRecord && ctx.rivalry.meetings && ctx.rivalry.meetings >= 2
      ? `${ctx.rivalry.allTimeRecord} across ${plural(ctx.rivalry.meetings, 'meeting')}.`
      : null,
    (ctx) => ctx.rivalry?.allTimeRecord && ctx.rivalry.mostRecentWinner
      ? `${ctx.rivalry.allTimeRecord} on the books. Most recent meeting went to ${ctx.rivalry.mostRecentWinner.name}.`
      : null,

    /* First meeting */
    (ctx) => ctx.rivalry?.trend === 'first-meeting'
      ? `No prior meetings. The series starts here.`
      : null,
    (ctx) => ctx.rivalry?.meetings === 0
      ? `Zero prior meetings on file. The history is about to start.`
      : null,

    /* Trend */
    (ctx) => ctx.rivalry?.trend === 'split'
      ? `Even split through the run. Either side wins on the right week.`
      : null,
    (ctx) => ctx.rivalry?.trend === 'one-sided' && ctx.rivalryTeamA && ctx.rivalry.allTimeRecord
      ? `${ctx.rivalryTeamA.name} has carried the matchup at ${ctx.rivalry.allTimeRecord}.`
      : null,
    (ctx) => ctx.rivalry?.trend === 'recent-reversal' && ctx.rivalryTeamA
      ? `Series flipped recently. ${ctx.rivalryTeamA.name} has the last few; the older meetings went the other way.`
      : null,

    /* Margin / blowout / close */
    (ctx) => ctx.rivalry?.catMarginNet
      ? `Net cat margin: ${ctx.rivalry.catMarginNet >= 0 ? '+' : ''}${ctx.rivalry.catMarginNet} in the series.`
      : null,
    (ctx) => ctx.rivalry?.biggestBlowout && ctx.rivalry.closestGame
      ? `Range: ${ctx.rivalry.biggestBlowout} on the worst night, ${ctx.rivalry.closestGame} on the tightest.`
      : null,
    (ctx) => ctx.rivalry?.biggestBlowout
      ? `Most lopsided meeting: ${ctx.rivalry.biggestBlowout}.`
      : null,
    (ctx) => ctx.rivalry?.closestGame
      ? `Closest meeting on file: ${ctx.rivalry.closestGame}.`
      : null,

    /* Quiet close */
    (ctx) => ctx.rivalry?.mostRecentWinner && ctx.rivalry.mostRecentWinner.year
      ? `Last meeting was ${ctx.rivalry.mostRecentWinner.year}. ${ctx.rivalry.mostRecentWinner.name} took it.`
      : null,
    (ctx) => ctx.rivalryTeamA && ctx.rivalryTeamB
      ? `${ctx.rivalryTeamA.name} versus ${ctx.rivalryTeamB.name}: series on the books, more to come.`
      : null,
  ],
}

/* ─────────────────────────────────────────────────────────────────
   KIND: FOOTNOTE-LONGEST-DYNASTY
   Ultra-compressed pill label. Career-stats footer.
───────────────────────────────────────────────────────────────── */

const FOOTNOTE_LONGEST_DYNASTY: HistoryTemplate = {
  kind: 'footnote-longest-dynasty',
  eyebrows: [
    () => 'LONGEST DYNASTY',
    () => 'LONGEST RUN',
    () => 'LONGEST REIGN',
    () => 'LONGEST STREAK ON TOP',
    () => 'TOP STREAK',
    () => 'CONSECUTIVE CROWNS',
  ],
  headlines: [
    /* Compact pill labels */
    (ctx) => ctx.footnoteTeam && ctx.footnoteValue
      ? `${ctx.footnoteTeam.name}. ${ctx.footnoteValue}.`
      : null,
    (ctx) => ctx.footnoteTeam && ctx.footnoteYearSpan
      ? `${ctx.footnoteTeam.name}. ${ctx.footnoteYearSpan}.`
      : null,
    (ctx) => ctx.footnoteTeam && ctx.footnoteValue && ctx.footnoteYearSpan
      ? `${ctx.footnoteTeam.name}. ${ctx.footnoteValue} in ${ctx.footnoteYearSpan}.`
      : null,
    (ctx) => ctx.footnoteValue && ctx.footnoteTeam
      ? `${ctx.footnoteValue}. ${ctx.footnoteTeam.name}.`
      : null,
    (ctx) => ctx.footnoteTeam && ctx.footnoteYear
      ? `${ctx.footnoteTeam.name}, starting ${ctx.footnoteYear}.`
      : null,
    (ctx) => ctx.footnoteTeam
      ? `${ctx.footnoteTeam.name} held the throne longest.`
      : null,
    (ctx) => ctx.footnoteTeam && ctx.footnoteValue
      ? `${ctx.footnoteValue} on top. ${ctx.footnoteTeam.name}.`
      : null,
    (ctx) => ctx.footnoteTeam
      ? `${ctx.footnoteTeam.name}: longest reign on file.`
      : null,
    (ctx) => ctx.footnoteValue
      ? `${ctx.footnoteValue}. The longest run the league has logged.`
      : null,
    (ctx) => ctx.footnoteTeam && ctx.footnoteValue
      ? `Longest dynasty: ${ctx.footnoteValue}, ${ctx.footnoteTeam.name}.`
      : null,
    (ctx) => ctx.footnoteTeam && ctx.footnoteYearSpan
      ? `Held ${ctx.footnoteYearSpan} straight. ${ctx.footnoteTeam.name}.`
      : null,
    (ctx) => ctx.footnoteTeam
      ? `${ctx.footnoteTeam.name}. Nobody held it longer.`
      : null,
  ],
  bodies: [],
}

/* ─────────────────────────────────────────────────────────────────
   KIND: FOOTNOTE-BIGGEST-BLOWOUT
───────────────────────────────────────────────────────────────── */

const FOOTNOTE_BIGGEST_BLOWOUT: HistoryTemplate = {
  kind: 'footnote-biggest-blowout',
  eyebrows: [
    () => 'BIGGEST BLOWOUT',
    () => 'WORST NIGHT ON FILE',
    () => 'BLOWOUT OF RECORD',
    () => 'WIDEST MARGIN',
    () => 'THE BEATDOWN',
    () => 'TOP RESULT',
  ],
  headlines: [
    (ctx) => ctx.footnoteTeam && ctx.footnoteOpponent && ctx.footnoteValue
      ? `${ctx.footnoteTeam.name} over ${ctx.footnoteOpponent.name}, ${ctx.footnoteValue}.`
      : null,
    (ctx) => ctx.footnoteValue && ctx.footnoteTeam && ctx.footnoteOpponent
      ? `${ctx.footnoteValue}. ${ctx.footnoteTeam.name} over ${ctx.footnoteOpponent.name}.`
      : null,
    (ctx) => ctx.footnoteTeam && ctx.footnoteValue && ctx.footnoteYear
      ? `${ctx.footnoteYear}. ${ctx.footnoteTeam.name}. ${ctx.footnoteValue}.`
      : null,
    (ctx) => ctx.footnoteValue
      ? `${ctx.footnoteValue}. Widest margin the league has seen.`
      : null,
    (ctx) => ctx.footnoteValue && ctx.footnoteYear
      ? `${ctx.footnoteValue} in ${ctx.footnoteYear}.`
      : null,
    (ctx) => ctx.footnoteTeam && ctx.footnoteOpponent
      ? `${ctx.footnoteTeam.name} beat ${ctx.footnoteOpponent.name} by the most ever.`
      : null,
    (ctx) => ctx.footnoteTeam && ctx.footnoteValue
      ? `${ctx.footnoteTeam.name}. ${ctx.footnoteValue} cats won.`
      : null,
    (ctx) => ctx.footnoteOpponent && ctx.footnoteValue
      ? `${ctx.footnoteValue}. ${ctx.footnoteOpponent.name} on the receiving end.`
      : null,
    (ctx) => ctx.footnoteValue
      ? `Worst meeting ever logged: ${ctx.footnoteValue}.`
      : null,
    (ctx) => ctx.footnoteTeam && ctx.footnoteValue && ctx.footnoteOpponent
      ? `${ctx.footnoteValue}. ${ctx.footnoteOpponent.name} remembers.`
      : null,
    (ctx) => ctx.footnoteTeam
      ? `${ctx.footnoteTeam.name} hung the biggest number.`
      : null,
    (ctx) => ctx.footnoteValue
      ? `${ctx.footnoteValue}. The worst night on file.`
      : null,
  ],
  bodies: [],
}

/* ─────────────────────────────────────────────────────────────────
   KIND: FOOTNOTE-CLOSEST-CHAMPIONSHIP
───────────────────────────────────────────────────────────────── */

const FOOTNOTE_CLOSEST_CHAMPIONSHIP: HistoryTemplate = {
  kind: 'footnote-closest-championship',
  eyebrows: [
    () => 'CLOSEST CHAMPIONSHIP',
    () => 'TIGHTEST FINAL',
    () => 'THINNEST MARGIN',
    () => 'BY A CAT',
    () => 'DECIDED LATE',
    () => 'ONE-CAT FINAL',
  ],
  headlines: [
    (ctx) => ctx.footnoteTeam && ctx.footnoteOpponent && ctx.footnoteValue
      ? `${ctx.footnoteTeam.name} over ${ctx.footnoteOpponent.name}, ${ctx.footnoteValue}.`
      : null,
    (ctx) => ctx.footnoteValue && ctx.footnoteYear
      ? `${ctx.footnoteYear}. ${ctx.footnoteValue}. ${pick(SYN.CLOSE)}.`
      : null,
    (ctx) => ctx.footnoteValue
      ? `${ctx.footnoteValue}. Decided in the last cat.`
      : null,
    (ctx) => ctx.footnoteTeam && ctx.footnoteOpponent
      ? `${ctx.footnoteTeam.name} edged ${ctx.footnoteOpponent.name} for the cup.`
      : null,
    (ctx) => ctx.footnoteValue
      ? `${ctx.footnoteValue}. Tightest final on file.`
      : null,
    (ctx) => ctx.footnoteTeam && ctx.footnoteYear && ctx.footnoteValue
      ? `${ctx.footnoteYear}: ${ctx.footnoteTeam.name}. ${ctx.footnoteValue}.`
      : null,
    (ctx) => ctx.footnoteTeam && ctx.footnoteOpponent && ctx.footnoteValue
      ? `${ctx.footnoteValue}. ${ctx.footnoteTeam.name} held off ${ctx.footnoteOpponent.name}.`
      : null,
    (ctx) => ctx.footnoteValue
      ? `${ctx.footnoteValue}. Thinnest margin ever.`
      : null,
    (ctx) => ctx.footnoteTeam && ctx.footnoteValue
      ? `${ctx.footnoteTeam.name} took it ${ctx.footnoteValue}.`
      : null,
    (ctx) => ctx.footnoteValue
      ? `Closest cup on file: ${ctx.footnoteValue}.`
      : null,
    (ctx) => ctx.footnoteTeam && ctx.footnoteOpponent
      ? `${ctx.footnoteTeam.name} and ${ctx.footnoteOpponent.name}. One cat apart.`
      : null,
    (ctx) => ctx.footnoteYear
      ? `${ctx.footnoteYear} final: decided late, by the smallest cat margin in the book.`
      : null,
  ],
  bodies: [],
}

/* ─────────────────────────────────────────────────────────────────
   KIND: FOOTNOTE-MOST-CONSISTENT
───────────────────────────────────────────────────────────────── */

const FOOTNOTE_MOST_CONSISTENT: HistoryTemplate = {
  kind: 'footnote-most-consistent',
  eyebrows: [
    () => 'MOST CONSISTENT',
    () => 'STEADY HAND',
    () => 'LOWEST VARIANCE',
    () => 'METRONOME',
    () => 'NEVER OUT',
    () => 'STEADY-EDDIE',
  ],
  headlines: [
    (ctx) => ctx.footnoteTeam && ctx.footnoteValue
      ? `${ctx.footnoteTeam.name}. ${ctx.footnoteValue} variance.`
      : null,
    (ctx) => ctx.footnoteTeam && ctx.footnoteValue
      ? `${ctx.footnoteValue}. ${ctx.footnoteTeam.name}.`
      : null,
    (ctx) => ctx.footnoteTeam
      ? `${ctx.footnoteTeam.name} never went off the rails.`
      : null,
    (ctx) => ctx.footnoteTeam
      ? `${ctx.footnoteTeam.name}: lowest variance on record.`
      : null,
    (ctx) => ctx.footnoteTeam && ctx.footnoteValue
      ? `${ctx.footnoteTeam.name}. ${ctx.footnoteValue}. Steady-Eddie pace.`
      : null,
    (ctx) => ctx.footnoteTeam
      ? `${ctx.footnoteTeam.name} ran the same number every week.`
      : null,
    (ctx) => ctx.footnoteValue
      ? `${ctx.footnoteValue}. The flattest line in the league.`
      : null,
    (ctx) => ctx.footnoteTeam
      ? `${ctx.footnoteTeam.name} never had a cold spell.`
      : null,
    (ctx) => ctx.footnoteTeam && ctx.footnoteValue
      ? `${ctx.footnoteTeam.name}: ${ctx.footnoteValue}. Same number, every week.`
      : null,
    (ctx) => ctx.footnoteTeam
      ? `${ctx.footnoteTeam.name} ran the metronome.`
      : null,
    (ctx) => ctx.footnoteTeam
      ? `${ctx.footnoteTeam.name}. Never volatile.`
      : null,
    (ctx) => ctx.footnoteValue
      ? `Consistency mark: ${ctx.footnoteValue}.`
      : null,
  ],
  bodies: [],
}

/* ─────────────────────────────────────────────────────────────────
   KIND: FOOTNOTE-MOST-VOLATILE
───────────────────────────────────────────────────────────────── */

const FOOTNOTE_MOST_VOLATILE: HistoryTemplate = {
  kind: 'footnote-most-volatile',
  eyebrows: [
    () => 'MOST VOLATILE',
    () => 'HIGHS AND LOWS',
    () => 'WILDEST SWING',
    () => 'BOOM OR BUST',
    () => 'HIGHEST VARIANCE',
    () => 'ROLLER COASTER',
  ],
  headlines: [
    (ctx) => ctx.footnoteTeam && ctx.footnoteValue
      ? `${ctx.footnoteTeam.name}. ${ctx.footnoteValue} variance.`
      : null,
    (ctx) => ctx.footnoteTeam && ctx.footnoteValue
      ? `${ctx.footnoteValue}. ${ctx.footnoteTeam.name}.`
      : null,
    (ctx) => ctx.footnoteTeam
      ? `${ctx.footnoteTeam.name}: highs and lows, both ends.`
      : null,
    (ctx) => ctx.footnoteTeam
      ? `${ctx.footnoteTeam.name}. Roller coaster of a year.`
      : null,
    (ctx) => ctx.footnoteTeam && ctx.footnoteValue
      ? `${ctx.footnoteTeam.name}: ${ctx.footnoteValue}. Boom or bust each week.`
      : null,
    (ctx) => ctx.footnoteTeam
      ? `${ctx.footnoteTeam.name} swung the widest.`
      : null,
    (ctx) => ctx.footnoteValue
      ? `${ctx.footnoteValue}. The widest line in the league.`
      : null,
    (ctx) => ctx.footnoteTeam
      ? `${ctx.footnoteTeam.name} never settled.`
      : null,
    (ctx) => ctx.footnoteTeam && ctx.footnoteValue
      ? `${ctx.footnoteTeam.name}: ${ctx.footnoteValue}. Big weeks, bad weeks, no middle.`
      : null,
    (ctx) => ctx.footnoteTeam
      ? `${ctx.footnoteTeam.name} ran hot, then cold, every month.`
      : null,
    (ctx) => ctx.footnoteTeam
      ? `${ctx.footnoteTeam.name}. Volatile by the chart.`
      : null,
    (ctx) => ctx.footnoteValue
      ? `Variance mark: ${ctx.footnoteValue}.`
      : null,
  ],
  bodies: [],
}

/* ─────────────────────────────────────────────────────────────────
   PUBLIC API
───────────────────────────────────────────────────────────────── */

export const historyTemplates: Record<HistoryKind, HistoryTemplate> = {
  'year-card-era-label': YEAR_CARD_ERA_LABEL,
  'year-card-headline': YEAR_CARD_HEADLINE,
  'all-time-legacy-hero': ALL_TIME_LEGACY_HERO,
  'dynasty-hitting': DYNASTY_HITTING,
  'dynasty-pitching': DYNASTY_PITCHING,
  'dynasty-punt-kings': DYNASTY_PUNT_KINGS,
  'record-book-fame': RECORD_BOOK_FAME,
  'record-book-shame': RECORD_BOOK_SHAME,
  'rivalry-profile-marquee': RIVALRY_PROFILE_MARQUEE,
  'rivalry-profile-procedural': RIVALRY_PROFILE_PROCEDURAL,
  'footnote-longest-dynasty': FOOTNOTE_LONGEST_DYNASTY,
  'footnote-biggest-blowout': FOOTNOTE_BIGGEST_BLOWOUT,
  'footnote-closest-championship': FOOTNOTE_CLOSEST_CHAMPIONSHIP,
  'footnote-most-consistent': FOOTNOTE_MOST_CONSISTENT,
  'footnote-most-volatile': FOOTNOTE_MOST_VOLATILE,
}

/**
 * Render a History page editorial moment.
 *
 * Returns the eyebrow, headline, and body strings. Filters templates
 * by their self-veto (`fn` returns null/undefined) before picking a
 * random one from the surviving pool. If nothing survives, falls back
 * to a safe default string per slot.
 *
 * Notes per kind:
 *   - YEAR-CARD-ERA-LABEL is eyebrow-only — headline slot holds the
 *     small-caps eyebrow text and body is empty.
 *   - YEAR-CARD-HEADLINE pairs an era-derived eyebrow (delegated to
 *     YEAR-CARD-ERA-LABEL by the caller) with a headline + body.
 *   - FOOTNOTE-* kinds are pill-only — they return eyebrow + headline
 *     and body is empty.
 */
export function renderHistory(kind: HistoryKind, ctx: HistoryContext): {
  eyebrow: string
  headline: string
  body: string
} {
  const template = historyTemplates[kind]
  return {
    eyebrow: renderOne(template.eyebrows, ctx) ?? defaultEyebrow(kind),
    headline: renderOne(template.headlines, ctx) ?? defaultHeadline(kind, ctx),
    body: renderOne(template.bodies, ctx) ?? '',
  }
}

function renderOne(variants: VariantFn[], ctx: HistoryContext): string | undefined {
  const rendered = variants
    .map((fn) => fn(ctx))
    .filter((s): s is string => typeof s === 'string' && s.length > 0)
  if (rendered.length === 0) return undefined
  return rendered[Math.floor(Math.random() * rendered.length)]
}

/* Safe fallbacks per kind. Kept quiet — the voice contracts when a
   beat has no data, it does not invent stakes. */
function defaultEyebrow(kind: HistoryKind): string {
  switch (kind) {
    case 'year-card-era-label': return 'CHAMPIONS'
    case 'year-card-headline': return 'CHAMPIONS'
    case 'all-time-legacy-hero': return 'ALL-TIME #1'
    case 'dynasty-hitting': return 'HITTING DYNASTY'
    case 'dynasty-pitching': return 'PITCHING DYNASTY'
    case 'dynasty-punt-kings': return 'PUNT KINGS'
    case 'record-book-fame': return 'HALL OF FAME'
    case 'record-book-shame': return 'HALL OF SHAME'
    case 'rivalry-profile-marquee': return 'FEATURED RIVALRY'
    case 'rivalry-profile-procedural': return 'HEAD-TO-HEAD'
    case 'footnote-longest-dynasty': return 'LONGEST DYNASTY'
    case 'footnote-biggest-blowout': return 'BIGGEST BLOWOUT'
    case 'footnote-closest-championship': return 'CLOSEST CHAMPIONSHIP'
    case 'footnote-most-consistent': return 'MOST CONSISTENT'
    case 'footnote-most-volatile': return 'MOST VOLATILE'
  }
}

function defaultHeadline(kind: HistoryKind, ctx: HistoryContext): string {
  switch (kind) {
    case 'year-card-era-label':
      return 'CHAMPIONS'
    case 'year-card-headline':
      return ctx.championTeam ? `${ctx.championTeam.name} took the year.` : 'The year is in the book.'
    case 'all-time-legacy-hero':
      return ctx.legacyTeam ? `${ctx.legacyTeam.name}. All-time #1.` : 'The all-time leader.'
    case 'dynasty-hitting':
    case 'dynasty-pitching':
      return ctx.dynastyTeam ? `${ctx.dynastyTeam.name} held the era.` : 'The era had a name.'
    case 'dynasty-punt-kings':
      return ctx.dynastyTeam && ctx.puntedCat
        ? `${ctx.dynastyTeam.name} punted ${ctx.puntedCat}.`
        : 'Punt strategy on file.'
    case 'record-book-fame':
      return ctx.recordTeam && ctx.recordValue
        ? `${ctx.recordValue}. ${ctx.recordTeam.name}.`
        : 'In the book.'
    case 'record-book-shame':
      return ctx.recordTeam && ctx.recordValue
        ? `${ctx.recordValue}. ${ctx.recordTeam.name}.`
        : 'The book remembers.'
    case 'rivalry-profile-marquee':
    case 'rivalry-profile-procedural':
      return ctx.rivalryTeamA && ctx.rivalryTeamB
        ? `${ctx.rivalryTeamA.name} versus ${ctx.rivalryTeamB.name}.`
        : 'Series on file.'
    case 'footnote-longest-dynasty':
    case 'footnote-biggest-blowout':
    case 'footnote-closest-championship':
    case 'footnote-most-consistent':
    case 'footnote-most-volatile':
      return ctx.footnoteTeam && ctx.footnoteValue
        ? `${ctx.footnoteTeam.name}. ${ctx.footnoteValue}.`
        : ctx.footnoteTeam
          ? ctx.footnoteTeam.name
          : ''
  }
}

/* Re-export the synonym pool keys for tests / introspection. */
export const historySynonymKeys = Object.keys(SYN)

/* Re-export record-type bucket helpers for downstream filters (e.g. a
   future "fame headlines only for career-count records" picker). */
export const historyRecordBuckets = {
  isCareerCountRecord,
  isRateRecord,
  isStreakRecord,
}

/**
 * Recently-used tracker — not implemented yet. The renderer is
 * stateless. Future work: track recent picks per (kind, scope key)
 * tuple (year for year cards, team for legacy/dynasty/footnotes,
 * pairing for rivalries) and bias away from them so the same
 * template does not repeat back-to-back inside a single session.
 */
