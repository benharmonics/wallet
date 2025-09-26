<script setup lang="ts">
import { ref } from 'vue'
import { formatZodError } from '@/util'
import { toast } from '@/toast'

const mnemonic = ref('')
const password = ref('')
const confirmInput = ref('')

type SubmissionStatus = 'pending' | 'refused' | 'submitting' | 'success' | 'failure'

const submissionStatus = ref<SubmissionStatus>('pending')
const message = ref('')

const confirmationMessage = 'I understand'

function onSubmit() {
  if (confirmInput.value !== confirmationMessage) {
    submissionStatus.value = 'refused'
    toast('error', 'Please confirm that you understand the consequences of this action')
    return
  }
  submissionStatus.value = 'submitting'
  fetch('/api/keystore', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mnemonic: mnemonic.value,
      password: password.value,
    }),
  })
    .then(async (res) => {
      const json = await res.json()
      if (res.status !== 201) {
        submissionStatus.value = 'refused'
        toast('error', 'Refused: ' + formatZodError(json.error))
        return
      }
      submissionStatus.value = 'success'
      toast('success', 'Success! Please log in with your new password.')
      message.value = 'Success! Please log in with your new password.'
    })
    .catch(() => {
      submissionStatus.value = 'failure'
      toast('error', 'Network failure.')
    })
}
</script>

<template>
  <div id="component">
    <p>Enter a new mnemonic sentence and password to set up a new wallet.</p>
    <p>
      <b id="warning-text">WARNING!</b> If you already have a wallet, <i>it will be overwritten.</i>
    </p>
    <p><b id="critical-text">This action cannot be undone.</b></p>
    <form v-if="submissionStatus !== 'success'" @submit.prevent="onSubmit">
      <div class="form-row">
        <label>Enter your mnemonic sentence which will seed your wallet</label>
        <input type="password" v-model="mnemonic" inputmode="text" required />
      </div>
      <div class="form-row">
        <label>Enter a new secure password</label>
        <input type="password" v-model="password" required />
      </div>
      <div class="form-row">
        <label
          >Type <i>{{ confirmationMessage }}</i> into the input below to confirm you are aware that
          <b>this action will delete information about your previous wallet, if it exists</b></label
        >
        <input type="text" v-model="confirmInput" :placeholder="confirmationMessage" required />
      </div>
      <button type="submit" :disabled="submissionStatus === 'submitting'">
        {{ submissionStatus === 'submitting' ? 'Submitting…' : 'Submit' }}
      </button>
    </form>
  </div>
</template>

<style scoped>
#component {
  display: grid;
  gap: 0.5rem;
}

#warning-text {
  color: magenta;
  font-style: italic;
  font-weight: bold;
}

#critical-text {
  color: red;
  font-weight: bolder;
}

form {
  display: grid;
  background: var(--color-background-mute);
  padding: 1rem;
  gap: 1rem;
  border-radius: 1rem;
}

.form-row {
  display: grid;
}

button {
  padding: 0.5rem;
  border-radius: 0.5rem;
  font-weight: bold;
}
</style>
