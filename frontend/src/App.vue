<script setup lang="ts">
import { onMounted } from "vue";
import { checkAuth, isLoggedIn } from "./auth";
import Navbar from './components/Navbar.vue'
import LoginForm from "./components/LoginForm.vue";
import Wallet from "./components/Wallet.vue";

onMounted(() => {
  // Initial auth check on startup
  checkAuth();
});
</script>

<template>
  <header>
    <Navbar />
  </header>

  <main>
    <!-- initial auth check loading -->
    <div v-if="isLoggedIn === null" class="content">
      Checking session…
    </div>

    <div v-else-if="!isLoggedIn" class="content">
      <LoginForm />
    </div>

    <div v-else class="content">
      <Wallet />
    </div>
  </main>
</template>

<style scoped>
.content {
  display: flex;
  justify-content: center;
}
</style>
