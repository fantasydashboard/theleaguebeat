/**
 * The football copy libraries, in one import.
 *
 * Re-exports only. `voice.ts` is deliberately not re-exported: it is a
 * test-time lint over this corpus, not copy, and nothing in the render
 * path should be able to reach it by importing the barrel.
 */

export * from './points'
export * from './streaks'
export * from './seasonStage'
