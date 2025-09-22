<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import CopyIcon from "@/assets/copy.svg";

const blockchains = ["ethereum", "bitcoin", "ripple", "stellar"];

// independent variables
const currentBlockchain = ref(blockchains[0]);
const addressIndex = ref(0);

// dependent variables
const address = ref<string | null>(null);
const balance = ref<string | null>(null);

onMounted(async () => {
  const addressRes = await fetch(`/api/wallet/address/${currentBlockchain.value}?addressIndex=${addressIndex.value}`);
  address.value = (await addressRes.json()).data;
  const balanceRes = await fetch(`/api/wallet/balance/${currentBlockchain.value}?addressIndex=${addressIndex.value}`);
  balance.value = (await balanceRes.json()).data;
})

watch(currentBlockchain, async (newBlockchain) => {
  // TODO: default to account other than first
  addressIndex.value = 0;
  balance.value = null;
  address.value = null;
  const addressRes = await fetch(`/api/wallet/address/${newBlockchain}?addressIndex=${addressIndex.value}`);
  address.value = (await addressRes.json()).data;
  const balanceRes = await fetch(`/api/wallet/balance/${newBlockchain}?addressIndex=${addressIndex.value}`);
  balance.value = (await balanceRes.json()).data;
});

watch(addressIndex, async (newAddressIndex) => {
  balance.value = null;
  address.value = null;
  const addressRes = await fetch(`/api/wallet/address/${currentBlockchain.value}?addressIndex=${newAddressIndex}`);
  address.value = (await addressRes.json()).data;
  const balanceRes = await fetch(`/api/wallet/balance/${currentBlockchain.value}?addressIndex=${newAddressIndex}`);
  balance.value = (await balanceRes.json()).data;
});

const incrementAddressIndex = () => addressIndex.value++;
const decrementAddressIndex = () => {
  if (addressIndex.value > 0) addressIndex.value--;
};
const onSelectBlockchain = (bc) => currentBlockchain.value = bc;

const capitalize = s => !s ? "" : s[0].toUpperCase() + s.slice(1);

function copyToClipboard(elementId) {
  const element = document.getElementById(elementId);
  navigator.clipboard.writeText(element.value);
  alert("Copied to clipboard"); // TODO: temporary alert a la toast
}
</script>

<template>
  <section id="wallet-page">
    <div class="dropdown">
      <button class="dropdown-btn">Select Blockchain</button>
      <div class="dropdown-content">
        <template v-for="bc in blockchains">
          <button @click="onSelectBlockchain(bc)" class="blockchain-selection">{{ capitalize(bc) }}</button>
        </template>
      </div>
    </div>

    <div id="page-content">
      <h1>{{ capitalize(currentBlockchain) }}</h1>
      <table id="address-summary-table">
        <tbody>
          <tr>
            <td>
              Address
            </td>
            <td>
              <span id="address-table-row">
                <span id="address-text">{{ address }}</span>
                <span id="copy-icon-container" @click="copyToClipboard('address-text')"><img :src="CopyIcon" alt="Copy" /></span>
              </span>
            </td>
          </tr>
          <tr>
            <td>
              Balance
            </td>
            <td>
              {{ balance }}
            </td>
          </tr>
          <tr v-if="currentBlockchain !== 'bitcoin'">
            <td>
              Address Index
            </td>
            <td>
              {{ addressIndex }}
              <button @click="incrementAddressIndex">+</button>
              <button @click="decrementAddressIndex">-</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
#wallet-page { display: flex }

#page-content { padding: 0 0 0 2rem }

h1 { font-weight: bold }

#address-summary-table {
  border-spacing: 15px 0;
  background: var(--color-background-mute);
  border-radius: 1rem;
  padding: 1rem;
}

#address-table-row {
  display: flex;
  align-items: center;
}

#address-text {
  display: inline-block;
  max-width: 24rem;
  overflow: hidden;
  text-overflow: ellipsis;
}

#copy-icon-container {
  margin: 0 0 0 0.5rem;
  display: inline-block;
  width: 1em;
}

#copy-icon-container:hover {
  cursor: pointer;
}

.dropdown {
  position: relative;
  display: inline-block;
}

.dropdown-btn {
  font-size: 14px;
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

.dropdown:hover .dropdown-content { display: block }
</style>
