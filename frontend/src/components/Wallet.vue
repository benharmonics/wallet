<script setup lang="ts">
import { ref, watch, onMounted } from "vue";

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
  addressIndex.value = 0; // triggers watch of addressIndex
});

watch(addressIndex, async (newAddressIndex) => {
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
              {{ address }}
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
          <tr>
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
#wallet-page {
  display: flex;
}

#page-content {
  padding: 0 0 0 2rem;
}

#address-summary-table {
  border-spacing: 15px 0;
  background: #2e2e2e;
  border-radius: 1rem;
  padding: 1rem;
  color: white;
}

.dropdown {
  position: relative;
  display: inline-block;
}

.dropdown-btn {
  font-size: 14px;
  font-weight: bold;
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
  font-weight: bold;
  width: 100%;
}

.dropdown:hover .dropdown-content { display: block }
</style>
