<script setup lang="ts">
import { isLoggedIn, logout } from '../auth'

const blockchains = ['ethereum', 'bitcoin', 'ripple', 'stellar']
const capitalize = (s) => (!s ? '' : s[0].toUpperCase() + s.slice(1))
const onSelectBlockchain = (blockchain) => console.log(blockchain) // TODO
</script>

<template>
  <nav>
    <div id="page-title">Cachette</div>
    <div v-if="isLoggedIn">
      <button @click="logout()" class="nav-btn">Log out</button>
    </div>
  </nav>
</template>

<style scoped>
nav {
  display: flex;
  justify-content: space-between;
  width: 100%;
  padding: 12px 12px;
}

#page-title {
  font-size: 32px;
  font-weight: bold;
}

.nav-btn {
  font-size: 16px;
  font-weight: bold;
  padding: 0.5rem 1rem;
  min-width: 160px;
}

.nav-btn:hover {
  cursor: pointer;
}
</style>
