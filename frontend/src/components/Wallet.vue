<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import CopyIcon from '@/assets/copy.svg'
import CloseIcon from '@/assets/close.svg'

const blockchains = ref([])

// independent variables
const currentBlockchain = ref<string | null>(null)
const addressIndex = ref(0)

// dependent variables
const address = ref<string | null>(null)
const balance = ref<string | null>(null)

// transaction menu
const transactionMenuOpen = ref(false)
const transactionSubmitted = ref(false)
const amount = ref<number | null>(null)
const destination = ref<string | null>(null)
const asset = ref<string | null>(null)

async function updateAddressAndBalance(blockchain: string, addressIdx: number) {
  const addressRes = await fetch(`/api/wallet/address/${blockchain}?addressIndex=${addressIdx}`)
  address.value = (await addressRes.json()).data
  const balanceRes = await fetch(`/api/wallet/balance/${blockchain}?addressIndex=${addressIdx}`)
  balance.value = (await balanceRes.json()).data
}

onMounted(async () => {
  const info = await fetch('/api/info')
  // TODO: these don't show up in a consistent order b/c of Object.keys
  blockchains.value = Object.keys((await info.json()).data.blockchains)
  currentBlockchain.value = blockchains.value[0]
  await updateAddressAndBalance(currentBlockchain.value, addressIndex.value)
})

watch(currentBlockchain, async (newBlockchain) => {
  // TODO: default to account other than first
  addressIndex.value = 0
  balance.value = null
  address.value = null
  transactionMenuOpen.value = false
  await updateAddressAndBalance(newBlockchain, addressIndex.value)
})

watch(addressIndex, async (newAddressIndex) => {
  balance.value = null
  address.value = null
  transactionMenuOpen.value = false
  await updateAddressAndBalance(currentBlockchain.value, newAddressIndex)
})

const incrementAddressIndex = () => addressIndex.value++
const decrementAddressIndex = () => {
  if (addressIndex.value > 0) addressIndex.value--
}

const capitalize = (s) => (!s ? '' : s[0].toUpperCase() + s.slice(1))

function copyToClipboard(elementId) {
  const element = document.getElementById(elementId)
  navigator.clipboard.writeText(element.innerHTML)
  alert('Copied to clipboard') // TODO: temporary alert a la toast
}

const onSelectBlockchain = (bc) => (currentBlockchain.value = bc)

async function onSubmitTransaction() {
  transactionSubmitted.value = true
  const res = await fetch('/api/wallet/send', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      protocol: currentBlockchain.value,
      destination: destination.value,
      amount: amount.value,
      asset: asset.value,
      addressIndex: addressIndex.value,
    }),
  })
  const json = await res.json()
  if (res.status >= 300) {
    throw new Error(`Failed to submit transaction: ${JSON.stringify(json.error)}`)
  }
  const data = json.data

  destination.value = null
  amount.value = null
  asset.value = null
  transactionMenuOpen.value = false
  transactionSubmitted.value = false
  alert(
    `Submitted transaction. Response:\n\tTransaction hash: ${data.txHash}\n\tAmount: ${data.amount}\n\tAsset: ${data.asset}`,
  )
}
</script>

<template>
  <section id="wallet-page">
    <div class="dropdown">
      <button class="button-no-click-operation">Select Blockchain</button>
      <div class="dropdown-content">
        <template v-for="bc in blockchains">
          <button @click="onSelectBlockchain(bc)" class="blockchain-selection">
            {{ capitalize(bc) }}
          </button>
        </template>
      </div>
    </div>

    <div id="page-content">
      <h1>{{ capitalize(currentBlockchain) }}</h1>
      <table id="address-summary-table">
        <tbody>
          <tr>
            <td>Address</td>
            <td>
              <span id="address-table-row">
                <span id="address-text">{{ address ?? 'Loading…' }}</span>
                <span class="small-icon-container" @click="copyToClipboard('address-text')">
                  <img :src="CopyIcon" alt="Copy" />
                </span>
              </span>
            </td>
          </tr>
          <tr>
            <td>Balance</td>
            <td>
              {{ balance ?? 'Loading…' }}
            </td>
          </tr>
          <tr v-if="currentBlockchain !== 'bitcoin'">
            <td>Address Index</td>
            <td>
              {{ addressIndex }}
              <button @click="incrementAddressIndex">+</button>
              <button @click="decrementAddressIndex">-</button>
            </td>
          </tr>
        </tbody>
      </table>
      <div class="justify-end">
        <button class="normal-button" @click="transactionMenuOpen = !transactionMenuOpen">
          Send
        </button>
      </div>
      <div id="transaction-menu" v-if="transactionMenuOpen">
        <div id="transaction-menu-top-row">
          <h2>Send</h2>
          <span @click="transactionMenuOpen = false" class="small-icon-container">
            <img :src="CloseIcon" alt="Close" />
          </span>
        </div>
        <form @submit.prevent="onSubmitTransaction">
          <label>Destination</label>
          <input type="text" v-model="destination" placeholder="Enter the destination address" />
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
            v-model="asset"
            placeholder="Enter asset or leave blank for native token"
          />
          <div id="transaction-menu-bottom-row">
            <button type="submit" class="normal-button" v-bind:disabled="transactionSubmitted">
              {{ transactionSubmitted ? 'Submitting…' : 'Submit' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </section>
</template>

<style scoped>
#wallet-page {
  display: flex;
  gap: 2rem;
}

#page-content {
  display: grid;
  gap: 10px;
  min-width: 40rem;
}

h1 {
  color: var(--color-heading);
  font-weight: bolder;
  font-size: 1.5rem;
}

h2 {
  color: var(--color-heading);
  font-weight: bold;
}

label {
  color: var(--color-heading);
}

#address-summary-table {
  border-spacing: 15px 0;
  background: var(--color-background-soft);
  border-radius: 0.5rem;
  padding: 1rem;
}

#address-table-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

#address-text {
  display: inline-block;
  max-width: 24rem;
  overflow: hidden;
  text-overflow: ellipsis;
}

.small-icon-container {
  display: inline-block;
  width: 1em;
}

.small-icon-container:hover {
  cursor: pointer;
}

.dropdown {
  position: relative;
  display: inline-block;
}

.button-no-click-operation {
  padding: 0.5rem 1rem;
}

.normal-button {
  padding: 0.5rem 1rem;
  font-weight: bold;
}

.normal-button:hover {
  cursor: pointer;
}

.normal-button:disabled:hover {
  cursor: none;
}

.dropdown-content {
  display: none;
  width: 100%;
}

.blockchain-selection {
  text-align: left;
  display: block;
  font-size: 16px;
  width: 100%;
}

.dropdown:hover .dropdown-content {
  display: block;
}

.justify-end {
  display: flex;
  justify-content: end;
}

#transaction-menu {
  background: var(--color-background-soft);
  border-radius: 0.5rem;
  padding: 1rem;
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
