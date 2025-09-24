import { reactive } from 'vue'

export type ToastPriority = 'success' | 'info' | 'error'

export interface ToastItem {
  id: number
  priority: ToastPriority
  message: string
}

const toasts = reactive<ToastItem[]>([])
let _id = 0

export function toast(priority: ToastPriority, message: string): number {
  const id = ++_id
  toasts.push({ id, priority, message })
  // Auto-remove after 5 seconds
  setTimeout(() => dismiss(id), 5000)
  return id
}

export function dismiss(id: number) {
  const idx = toasts.findIndex((t) => t.id === id)
  if (idx !== -1) toasts.splice(idx, 1)
}

export function useToasts() {
  // For components to read/dismiss
  return { toasts, dismiss }
}
