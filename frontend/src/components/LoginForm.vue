<script setup lang="ts">
import { ref } from 'vue'
import { login } from '../auth'
import KeystoreEntry from './KeystoreEntry.vue'

const password = ref('')
const error = ref<string | null>(null)
const submitting = ref(false)

const keystoreEntryOpen = ref(false)

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
  <div id="page">
    <section id="login">
      <h1>Please enter your password</h1>

      <form class="flex-gap-1" @submit.prevent="onSubmit">
        <input
          v-model="password"
          id="password-input"
          type="password"
          inputmode="text"
          autocomplete="current-password"
          placeholder="Password"
          :disabled="submitting"
          required
        />

        <button type="submit" class="btn" :disabled="submitting">
          {{ submitting ? 'Signing in…' : 'Sign in' }}
        </button>

        <p v-if="error">{{ error }}</p>
      </form>
    </section>
    <section id="actions">
      <div class="flex-gap-1">
        <h3>Create a new wallet?</h3>
        <button @click="keystoreEntryOpen = !keystoreEntryOpen" class="btn">Create</button>
      </div>
      <keystore-entry v-if="keystoreEntryOpen" />
    </section>
  </div>
</template>

<style scoped>
#page {
  display: grid;
  max-width: 40%;
}

#login {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

h1 {
  color: var(--color-heading);
}

#password-input {
  padding: 4px;
  border-radius: 0.5rem;
}

.btn {
  padding: 2px 8px;
  border-radius: 0.5rem;
}

#actions {
  padding: 4rem 0 0 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.flex-gap-1 {
  display: flex;
  gap: 1rem;
}
</style>
