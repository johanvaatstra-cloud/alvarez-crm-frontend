<template>
  <div class="page">
    <div class="page-header">
      <h1>{{ t('settings.title') }}</h1>
      <p class="subtitle">{{ t('settings.systemSettings') }}</p>
    </div>

    <div class="settings-card">
      <div class="settings-section">
        <h3>{{ t('settings.language') }}</h3>
        <div class="field">
          <label>{{ t('settings.languageLabel') }}</label>
          <div class="lang-options">
            <button
              v-for="loc in locales"
              :key="loc.code"
              :class="['lang-option', { active: locale === loc.code }]"
              @click="setLocale(loc.code)"
            >
              <span class="lang-flag">{{ loc.flag }}</span>
              <span class="lang-name">{{ loc.name }}</span>
            </button>
          </div>
        </div>
      </div>

      <div class="coming-soon-section">
        <i class="pi pi-cog" />
        <p>{{ t('settings.comingSoon') }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'

const { t, locale } = useI18n()

const locales = [
  { code: 'nl', flag: '🇳🇱', name: 'Nederlands' },
  { code: 'en', flag: '🇬🇧', name: 'English' },
  { code: 'es', flag: '🇪🇸', name: 'Español' },
  { code: 'ca', flag: '🏴', name: 'Català' }
]

function setLocale(code) {
  locale.value = code
  localStorage.setItem('crm_locale', code)
}
</script>

<style scoped>
.page { padding: 32px; max-width: 1200px; }
.page-header { margin-bottom: 32px; }
.page-header h1 { font-size: 24px; font-weight: 700; color: #1b4332; margin: 0 0 4px; }
.subtitle { color: #6c757d; margin: 0; }

.settings-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,.08);
  overflow: hidden;
}

.settings-section {
  padding: 24px 28px;
  border-bottom: 1px solid #f1f3f5;
}

.settings-section h3 {
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #6c757d;
  margin: 0 0 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field label {
  font-size: 13px;
  font-weight: 500;
  color: #495057;
}

.lang-options {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.lang-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.15s;
  color: #495057;
}

.lang-option:hover {
  border-color: #2d6a4f;
  background: #f0faf4;
  color: #2d6a4f;
}

.lang-option.active {
  border-color: #2d6a4f;
  background: #e8f5ee;
  color: #1b4332;
  font-weight: 600;
}

.lang-flag { font-size: 18px; }
.lang-name { font-size: 13px; }

.coming-soon-section {
  padding: 48px 64px;
  text-align: center;
  color: #adb5bd;
}
.coming-soon-section i { font-size: 48px; display: block; margin-bottom: 16px; }
.coming-soon-section p { margin: 0; font-size: 14px; }
</style>
