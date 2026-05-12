<template>
  <div class="lang-switcher">
    <button
      v-for="loc in locales"
      :key="loc.code"
      :class="['lang-btn', { active: locale === loc.code }]"
      @click="setLocale(loc.code)"
    >{{ loc.flag }} {{ loc.label }}</button>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'

const { locale } = useI18n()

const locales = [
  { code: 'nl', flag: '🇳🇱', label: 'NL' },
  { code: 'en', flag: '🇬🇧', label: 'EN' },
  { code: 'es', flag: '🇪🇸', label: 'ES' },
  { code: 'ca', flag: '🏴', label: 'CA' }
]

function setLocale(code) {
  locale.value = code
  localStorage.setItem('crm_locale', code)
}
</script>

<style scoped>
.lang-switcher {
  display: flex;
  gap: 4px;
  padding: 8px 12px;
  border-top: 1px solid rgba(255,255,255,0.1);
}
.lang-btn {
  background: transparent;
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 4px;
  color: rgba(255,255,255,0.7);
  font-size: 11px;
  padding: 3px 6px;
  cursor: pointer;
  transition: all 0.15s;
}
.lang-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }
.lang-btn.active { background: rgba(255,255,255,0.2); color: #fff; border-color: rgba(255,255,255,0.5); }
</style>
