<script setup lang="ts">
import { ref } from 'vue'
import { accessToken } from '../auth'
import { toast } from '../toast'
import { formatZodError } from '../util'
import CloseIcon from '@/assets/close.svg'

const emit = defineEmits(['txSubmitted', 'close'])
const props = defineProps<{
  currentBlockchain: string | null
  addressIndex: number
}>()

const transactionSubmitted = ref(false)
const amount = ref<number | null>(null)
const destination = ref<string | null>(null)
const asset = ref<string | null>(null)

async function onSubmit() {
  transactionSubmitted.value = true
  const res = await fetch('/api/wallet/send', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken()}` },
    body: JSON.stringify({
      protocol: props.currentBlockchain,
      addressIndex: props.addressIndexs,
      destination: destination.value,
      amount: amount.value,
      asset: asset.value,
    }),
  })
  const json = await res.json()
  if (res.status >= 300) {
    console.error(json.error)
    toast('error', `Failed to submit transaction: ${formatZodError(json.error)}`)
    return
  }
  const data = json.data
  toast(
    'success',
    `Submitted transaction. Response:\n\tTransaction hash: ${data.txHash}\n\tAmount: ${data.amount}\n\tAsset: ${data.asset}`,
  )

  destination.value = null
  amount.value = null
  asset.value = null
  transactionSubmitted.value = false
  emit('txSubmitted')
}
</script>

<template>
  <div id="component">
    <div id="transaction-menu-top-row">
      <h2>Send</h2>
      <span @click="emit('close')" class="small-icon-container">
        <img :src="CloseIcon" alt="Close" />
      </span>
    </div>
    <form @submit.prevent="onSubmit">
      <label>Destination</label>
      <input type="text" placeholder="Enter the destination address" v-model="destination" />
      <label>Amount</label>
      <input
        type="number"
        step="any"
        min="0.000000000000000001"
        placeholder="Enter a positive amount"
        v-model="amount"
      />
      <label>Asset (optional)</label>
      <input
        type="text"
        placeholder="Enter asset or leave blank for native token"
        v-model="asset"
      />
      <div id="transaction-menu-bottom-row">
        <button type="submit" class="normal-button" v-bind:disabled="transactionSubmitted">
          {{ transactionSubmitted ? 'Submitting…' : 'Submit' }}
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
#component {
  background: var(--color-background-soft);
  border-radius: 0.5rem;
  padding: 1rem;
}

h2 {
  color: var(--color-heading);
  font-weight: bold;
}

#transaction-menu-top-row {
  display: flex;
  justify-content: space-between;
}

#transaction-menu-bottom-row {
  display: flex;
  justify-content: end;
  padding: 1rem 0 0 0;
}

form {
  display: grid;
}
</style>
