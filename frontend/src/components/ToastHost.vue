<script setup lang="ts">
import { useToasts } from '../toast'
const { toasts, dismiss } = useToasts()
</script>

<template>
  <div class="toast-host" aria-live="polite" aria-atomic="true">
    <div v-for="t in toasts" :key="t.id" class="toast" :class="t.priority" role="status">
      <span class="msg">{{ t.message }}</span>
      <button class="dismiss" @click="dismiss(t.id)" aria-label="Dismiss toast">Dismiss</button>
    </div>
  </div>
</template>

<style scoped>
.toast-host {
  position: fixed;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 9999;
  pointer-events: none; /* clicks pass through gaps */
}

.toast {
  pointer-events: auto; /* allow clicks on the toast itself */
  min-width: 320px;
  max-width: 90vw;
  padding: 10px 12px;
  border-radius: 8px;
  color: #fff;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: space-between;
  font:
    14px/1.2 system-ui,
    -apple-system,
    Segoe UI,
    Roboto,
    Ubuntu,
    'Helvetica Neue',
    Arial,
    'Noto Sans',
    sans-serif;
}

.toast .msg {
  margin-right: 12px;
  word-break: break-word;
}

/* Priorities */
.toast.success {
  background: #16a34a;
} /* green-600 */
.toast.info {
  background: #2563eb;
} /* blue-600 */
.toast.error {
  background: #dc2626;
} /* red-600 */

.dismiss {
  appearance: none;
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  border: 0;
  border-radius: 6px;
  padding: 6px 8px;
  cursor: pointer;
}
.dismiss:hover {
  background: rgba(255, 255, 255, 0.25);
}
</style>
