import { describe, it, expect } from 'vitest'
import { templateForSection, dedupeByTemplate } from '@/editorial/video/sceneRouting'
import type { IssueSection } from '@/editorial/composition'

const section = (type: IssueSection['type'], priority: number): IssueSection =>
  ({ type, priority })

describe('templateForSection', () => {
  it('routes face-off style sections to the throne', () => {
    expect(templateForSection('hero-faceoff')).toBe('the-throne')
    expect(templateForSection('matchup-of-week')).toBe('the-throne')
  })

  it('routes single-team arc sections to the climb', () => {
    expect(templateForSection('hero-solo')).toBe('the-climb')
    expect(templateForSection('streak-watch')).toBe('the-climb')
  })

  it('returns null for sections with no scene — they are skipped, not faked', () => {
    expect(templateForSection('quick-reads-ticker')).toBeNull()
    expect(templateForSection('draft-autopsy')).toBeNull()
  })
})

describe('dedupeByTemplate', () => {
  it('keeps only the first section for each template', () => {
    const out = dedupeByTemplate([
      section('hero-faceoff', 100),
      section('matchup-of-week', 70),
    ])
    expect(out.map((s) => s.type)).toEqual(['hero-faceoff'])
  })

  it('keeps sections that map to different templates', () => {
    const out = dedupeByTemplate([
      section('hero-faceoff', 100),
      section('hero-solo', 70),
    ])
    expect(out.map((s) => s.type)).toEqual(['hero-faceoff', 'hero-solo'])
  })

  it('drops unmapped sections entirely', () => {
    const out = dedupeByTemplate([
      section('hero-faceoff', 100),
      section('quick-reads-ticker', 5),
    ])
    expect(out.map((s) => s.type)).toEqual(['hero-faceoff'])
  })

  it('preserves input order, which composeIssue already sorted by priority', () => {
    const out = dedupeByTemplate([
      section('hero-solo', 100),
      section('hero-faceoff', 90),
    ])
    expect(out.map((s) => s.type)).toEqual(['hero-solo', 'hero-faceoff'])
  })

  it('returns an empty array for an empty input', () => {
    expect(dedupeByTemplate([])).toEqual([])
  })
})
