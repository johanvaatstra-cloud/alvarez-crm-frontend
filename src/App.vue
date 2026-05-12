<template>
  <Toast />
  <router-view />
</template>

<script setup>
import Toast from 'primevue/toast'
</script>

<style>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f8f9fa;
  color: #212529;
  line-height: 1.5;
}

:root {
  --green-primary: #2d6a4f;
  --green-dark: #1b4332;
  --green-light: #40916c;
  --green-pale: #d8f3dc;
}
</style>
