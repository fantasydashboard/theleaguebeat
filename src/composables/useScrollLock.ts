import { onBeforeUnmount, onMounted } from 'vue'

let lockCount = 0
let originalOverflow = ''

/**
 * Ref-counted body scroll lock. Multiple concurrent locks compose; the body
 * is only restored when the last lock is released.
 */
export function useScrollLock() {
  onMounted(() => {
    if (lockCount === 0) {
      originalOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
    }
    lockCount++
  })

  onBeforeUnmount(() => {
    lockCount = Math.max(0, lockCount - 1)
    if (lockCount === 0) {
      document.body.style.overflow = originalOverflow
    }
  })
}
