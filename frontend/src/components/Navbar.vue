<script setup lang="ts">
import { isLoggedIn, logout } from '../auth'
</script>

<template>
  <nav>
    <div id="page-title">Cachette</div>
    <button v-if="isLoggedIn" @click="logout()" class="nav-btn">Log out</button>
  </nav>
</template>

<style scoped>
nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 4rem;
  background: var(--color-background-mute);
}

#page-title {
  color: var(--color-heading);
  font-size: 32px;
  font-weight: bold;
}

.nav-btn {
  font-size: 16px;
  font-weight: bold;
  padding: 0.5rem 1rem;
  min-width: 160px;
  border-radius: 0.5rem;
}

.nav-btn:hover { cursor: pointer }
</style>
