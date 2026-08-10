import { describe, it, expect } from 'vitest'
import { templateForSection } from '@/editorial/video/sceneRouting'

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
