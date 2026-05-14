<template>
  <Toast />
  <router-view />
</template>

<script setup>
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import Toast from 'primevue/toast'
import { initSyncService } from './services/syncService.js'
import { useTheme } from './composables/useTheme.js'

const { t }   = useI18n()
const toast   = useToast()

// Initialize global theme (applies class to <html> immediately)
useTheme()

onMounted(() => {
  initSyncService(toast, t)
})
</script>

<style>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.5;
  transition: background 0.3s, color 0.3s;
}

:root {
  --green-primary: #2d6a4f;
  --green-dark: #1b4332;
  --green-light: #40916c;
  --green-pale: #d8f3dc;
}
</style>
