<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { accessToken, refresh } from '@/auth'
import { toast } from '@/toast'
import TheTransactionMenu from '@/components/TheTransactionMenu.vue'
import TheCryptoLogo from '@/components/TheCryptoLogo.vue'
import CopyIcon from '@/assets/copy.svg'

const blockchains = ref([])

// independent variables
const currentBlockchain = ref<string | null>(null)
const addressIndex = ref(0)

// dependent variables
const address = ref<string | null>(null)
const balance = ref<string | null>(null)

const transactionMenuOpen = ref(false)

async function updateAddress(blockchain: string, addressIdx: number) {
  const addressRes = await fetch(`/api/wallet/address/${blockchain}?addressIndex=${addressIdx}`, {
    headers: { Authorization: `Bearer ${accessToken()}` },
  })
  address.value = (await addressRes.json()).data
}

async function updateBalance(blockchain: string, addressIdx: number) {
  const balanceRes = await fetch(`/api/wallet/balance/${blockchain}?addressIndex=${addressIdx}`, {
    headers: { Authorization: `Bearer ${accessToken()}` },
  })
  balance.value = (await balanceRes.json()).data
}

async function updateAddressAndBalance(blockchain: string, addressIdx: number) {
  await Promise.all([updateAddress(blockchain, addressIdx), updateBalance(blockchain, addressIdx)])
  refresh()
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

watch(transactionMenuOpen, refresh)

const incrementAddressIndex = () => addressIndex.value++
const decrementAddressIndex = () => {
  if (addressIndex.value > 0) addressIndex.value--
}

const capitalize = (s) => (!s ? '' : s[0].toUpperCase() + s.slice(1))

function copyToClipboard(elementId) {
  const element = document.getElementById(elementId)
  navigator.clipboard.writeText(element.innerHTML)
  toast('info', 'Copied to clipboard')
}

function delayedUpdateAndBalanceUpdate(delay: number = 5000) {
  setTimeout(() => updateAddressAndBalance(currentBlockchain.value, addressIndex.value), delay)
}

const onSelectBlockchain = (bc) => (currentBlockchain.value = bc)
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
      <div id="blockchain-name-and-logo">
        <span id="blockchain-logo">
          <TheCryptoLogo :current-blockchain="currentBlockchain" />
        </span>
        <h1>{{ capitalize(currentBlockchain) }}</h1>
      </div>
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
      <TheTransactionMenu
        :current-blockchain="currentBlockchain"
        :address-index="addressIndex"
        v-if="transactionMenuOpen"
        @tx-submitted="delayedUpdateAndBalanceUpdate"
        @close="transactionMenuOpen = false"
      />
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

#blockchain-name-and-logo {
  display: flex;
  gap: 1rem;
  align-items: center;
  background: linear-gradient(to right, blue, lightblue);
  border-radius: 0.5rem;
  padding: 0.5rem 1rem;
}

#blockchain-logo {
  display: flex;
  min-width: 2rem;
  overflow: hidden;
  align-items: center;
  justify-content: center;
}

h1 {
  color: white;
  font-weight: bolder;
  font-size: 2rem;
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

.dropdown {
  position: relative;
  display: inline-block;
}

.button-no-click-operation {
  padding: 0.5rem 1rem;
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
</style>
