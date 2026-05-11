<template>
  <main>
    <h1>Vue 3 + Vite</h1>
    <button @click="count++">count: {{ count }}</button>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue';
const count = ref(0);
</script>
