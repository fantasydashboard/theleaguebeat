/**
 * Whether the slide-export controls are switched on.
 *
 * OFF BY DEFAULT, deliberately. Most readers want to read the issue;
 * exporting slides is a thing a commissioner does when they are making
 * a video, and a row of Download buttons beside every section is
 * clutter for everyone who never will. Opting in keeps the page quiet
 * for the majority and costs the minority one visit to Settings.
 *
 * Stored in localStorage rather than on the account: it describes how
 * this person uses THIS device — the machine they edit video on — and
 * a server round trip would mean the buttons flicker in on load.
 *
 * Module-level ref, so the Settings toggle and every Present button on
 * the Issue page are reading the same value and update together
 * without a store or an event bus.
 */
import { ref, watch } from 'vue'

const KEY = 'tlb_present_enabled'

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    // Private mode, or storage disabled. Off is the safe answer: it
    // matches the default, so nobody gets buttons they did not ask for.
    return false
  }
}

export const presentEnabled = ref(read())

watch(presentEnabled, (on) => {
  try {
    if (on) localStorage.setItem(KEY, '1')
    else localStorage.removeItem(KEY)
  } catch {
    /* nothing to do — the ref still drives this session */
  }
})

/** For the Settings toggle. */
export function setPresentEnabled(on: boolean): void {
  presentEnabled.value = on
}
