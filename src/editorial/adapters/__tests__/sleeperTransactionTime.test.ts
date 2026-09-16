import { describe, it, expect } from 'vitest'
import { normalizeSleeperTransaction } from '../sleeperAdapter'

const CREATED = Date.UTC(2026, 8, 15, 6, 19)   // Tue, when it was entered
const SETTLED = Date.UTC(2026, 8, 16, 9, 2)    // Wed, when the run cleared

const claim = (over: Record<string, unknown> = {}) => ({
  transaction_id: 'x',
  type: 'waiver',
  status: 'complete',
  leg: 1,
  created: CREATED,
  status_updated: SETTLED,
  settings: { waiver_bid: 15 },
  adds: { '1': 3 },
  drops: null,
  ...over,
})

describe('when a Sleeper transaction says it happened', () => {
  it('stamps the settlement, not the submission', () => {
    // The contract says `timestamp` is when the transaction PROCESSED.
    // A waiver claim is entered days before the run clears it, so
    // reading `created` filed a Wednesday move under Tuesday — and the
    // wire, which groups by the run that settled, then split one run
    // across two days.
    const out = normalizeSleeperTransaction(claim(), 2, null)!
    expect(out.timestamp).toBe(SETTLED)
    expect(out.timestamp).not.toBe(CREATED)
  })

  it('falls back to creation when the platform omits a settlement time', () => {
    const out = normalizeSleeperTransaction(claim({ status_updated: undefined }), 2, null)!
    expect(out.timestamp).toBe(CREATED)
  })
})
