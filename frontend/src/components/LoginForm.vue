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

    <form @submit.prevent="onSubmit">
      <input
        v-model="password"
        id="password-input"
        type="password"
        inputmode="text"
        autocomplete="current-password"
        placeholder="Password"
        class=""
        :disabled="submitting"
        required
      />

      <button type="submit" id="sign-in-btn" :disabled="submitting">
        {{ submitting ? 'Signing in…' : 'Sign in' }}
      </button>

      <p v-if="error">{{ error }}</p>
    </form>
  </section>
</template>

<style scoped>
#login{
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

h1 { color: var(--color-heading) }

form { display: flex; gap: 1rem; }

#password-input {
  padding: 4px;
  border-radius: 0.5rem;
}

#sign-in-btn {
  padding: 2px 8px;
}
</style>
