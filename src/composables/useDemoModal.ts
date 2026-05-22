import { onMounted, onBeforeUnmount, nextTick, type Ref } from 'vue'
import { useScrollLock } from './useScrollLock'

interface UseDemoModalOptions {
  dialogRef: Ref<HTMLElement | null>
  closeBtnRef: Ref<HTMLElement | null>
  onClose: () => void
}

/**
 * Standard demo-modal scaffolding:
 * - Locks body scroll (ref-counted)
 * - Captures previously-focused element and restores on unmount
 * - Focuses the close button on mount (next tick so the dialog is painted)
 * - Traps Tab within the dialog
 * - Closes on Escape
 */
export function useDemoModal({ dialogRef, closeBtnRef, onClose }: UseDemoModalOptions) {
  useScrollLock()

  let previouslyFocused: HTMLElement | null = null

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      onClose()
      return
    }
    if (e.key !== 'Tab' || !dialogRef.value) return
    const focusable = dialogRef.value.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )
    if (focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  onMounted(() => {
    previouslyFocused = document.activeElement as HTMLElement | null
    nextTick(() => closeBtnRef.value?.focus())
    document.addEventListener('keydown', onKeydown)
  })

  onBeforeUnmount(() => {
    document.removeEventListener('keydown', onKeydown)
    previouslyFocused?.focus?.()
  })
}
