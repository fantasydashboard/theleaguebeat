/**
 * A signal from the Issue page up to the layout's masthead.
 *
 * The masthead lives in `MyLeagueLayout`, which is a shell — it has the
 * league row but never parses league data, so it cannot know whether a
 * game has been played. `IssueView` does. Vue provides no way to pass a
 * value from a child route up to its layout, so this is a module-level
 * ref rather than provide/inject.
 *
 * Deliberately tiny and deliberately one-way: the page writes, the
 * chrome reads. Anything more travelling through here belongs in a
 * store instead.
 */
import { ref } from 'vue'

/**
 * Whether the league being viewed has played a game.
 *
 * `undefined` means "not yet known", which is not the same as false —
 * the masthead keeps its previous behaviour rather than guessing
 * preseason during the moment before data arrives.
 */
export const issueSeasonStarted = ref<boolean | undefined>(undefined)
