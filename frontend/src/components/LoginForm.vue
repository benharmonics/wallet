<script setup lang="ts">
import { ref } from 'vue'
import { login } from '../auth'

const password = ref('')
const error = ref<string | null>(null)
const submitting = ref(false)

async function onSubmit() {
  error.value = null
  submitting.value = true
  const { ok, error: err } = await login(password.value)
  submitting.value = false

  if (!ok) {
    error.value = err ?? 'Login failed.'
    // keep the password field; user can correct and resubmit
  } else {
    password.value = ''
  }
}
</script>

<template>
  <section id="login">
    <h1>Please enter your password</h1>

    <form @submit.prevent="onSubmit" class="space-y-4">
      <input
        v-model="password"
        type="password"
        inputmode="text"
        autocomplete="current-password"
        placeholder="Password"
        class=""
        :disabled="submitting"
        required
      />

      <button type="submit" class="" :disabled="submitting">
        {{ submitting ? 'Signing in…' : 'Sign in' }}
      </button>

      <p v-if="error">{{ error }}</p>
    </form>
  </section>
</template>

<style scoped>
.space-y-1 > * + * {
  margin-top: 0.25rem;
}
.space-y-2 > * + * {
  margin-top: 0.5rem;
}
.space-y-3 > * + * {
  margin-top: 0.75rem;
}
.space-y-4 > * + * {
  margin-top: 1rem;
}
</style>
