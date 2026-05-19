<template>
  <div class="page" :class="isDark ? 'theme-dark' : 'theme-light'">

    <!-- Blob achtergronden -->
    <div class="blobs" aria-hidden="true">
      <div class="blob blob-1" />
      <div class="blob blob-2" />
      <div class="blob blob-3" />
      <div class="blob blob-4" />
    </div>

    <div class="page-header">
      <h1>{{ t('settings.title') }}</h1>
      <p class="subtitle">{{ t('settings.systemSettings') }}</p>
    </div>

    <div class="glass-card settings-card">
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
import { useTheme } from '../../composables/useTheme.js'

const { t, locale } = useI18n()
const { isDark } = useTheme()

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
/* ── Thema variabelen ─────────────────────────────────────────────────────── */
.theme-dark {
  --bg:         #0f1923;
  --card:       rgba(255,255,255,0.07);
  --card-top:   rgba(255,255,255,0.22);
  --card-left:  rgba(255,255,255,0.10);
  --border:     rgba(255,255,255,0.06);
  --text:       rgba(255,255,255,0.92);
  --muted:      rgba(255,255,255,0.45);
  --accent:     #4ade80;
  --accent-dim: rgba(74,222,128,0.15);
  --shadow:     0 8px 32px rgba(0,0,0,0.45);
  background:   #0f1923;
  color:        rgba(255,255,255,0.92);
}

.theme-light {
  --bg:         transparent;
  --card:       rgba(255,255,255,0.68);
  --card-top:   rgba(255,255,255,0.97);
  --card-left:  rgba(255,255,255,0.85);
  --border:     rgba(0,0,0,0.05);
  --text:       #1a2e1a;
  --muted:      #6c757d;
  --accent:     #2d6a4f;
  --accent-dim: rgba(45,106,79,0.10);
  --shadow:     0 2px 16px rgba(0,0,0,0.07);
  background:   linear-gradient(135deg, #e8f5ee 0%, #f0f4ff 100%);
  background-attachment: fixed;
  color:        #1a2e1a;
}

/* ── Blobs ───────────────────────────────────────────────────────────────── */
.blobs { position: fixed; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }
.blob  { position: absolute; border-radius: 50%; filter: blur(72px); opacity: 0; transition: opacity .4s; }
.theme-dark .blob { opacity: 1; }
.blob-1 { width: 600px; height: 600px; top: -120px; right: -80px;  background: radial-gradient(circle, rgba(74,222,128,0.28) 0%, transparent 68%); }
.blob-2 { width: 520px; height: 520px; bottom: 10%; left: -120px;  background: radial-gradient(circle, rgba(96,165,250,0.22) 0%, transparent 68%); }
.blob-3 { width: 420px; height: 420px; top: 42%;    right: 28%;    background: radial-gradient(circle, rgba(167,139,250,0.20) 0%, transparent 68%); }
.blob-4 { width: 360px; height: 360px; bottom: 8%;  right: 8%;     background: radial-gradient(circle, rgba(34,211,238,0.16) 0%, transparent 68%); }
.page > *:not(.blobs) { position: relative; z-index: 1; }

/* ── Layout ──────────────────────────────────────────────────────────────── */
.page { padding: 32px; max-width: 1200px; min-height: 100vh; }

.page-header { margin-bottom: 32px; }
.page-header h1 { font-size: 24px; font-weight: 700; color: var(--text); margin: 0 0 4px; }
.subtitle { color: var(--muted); margin: 0; }

/* ── Glass kaart ─────────────────────────────────────────────────────────── */
.glass-card {
  background: var(--card);
  border-radius: 14px;
  border-top: 1px solid var(--card-top);
  border-left: 1px solid var(--card-left);
  border-right: none;
  border-bottom: none;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: var(--shadow);
  overflow: hidden;
}

.settings-card { max-width: 600px; }

.settings-section {
  padding: 24px 28px;
  border-bottom: 1px solid var(--border);
}

.settings-section h3 {
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--muted);
  margin: 0 0 16px;
}

.field { display: flex; flex-direction: column; gap: 8px; }

.field label { font-size: 13px; font-weight: 500; color: var(--muted); }

/* ── Taalknopjes ─────────────────────────────────────────────────────────── */
.lang-options { display: flex; gap: 8px; flex-wrap: wrap; }

.lang-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.15s;
  color: var(--muted);
}

.lang-option:hover {
  border-color: var(--accent);
  background: var(--accent-dim);
  color: var(--accent);
}

.lang-option.active {
  border-color: var(--accent);
  background: var(--accent-dim);
  color: var(--accent);
  font-weight: 600;
}

.lang-flag { font-size: 18px; }
.lang-name { font-size: 13px; }

/* ── Binnenkort ──────────────────────────────────────────────────────────── */
.coming-soon-section {
  padding: 48px 64px;
  text-align: center;
  color: var(--muted);
  opacity: 0.6;
}
.coming-soon-section i { font-size: 48px; display: block; margin-bottom: 16px; }
.coming-soon-section p { margin: 0; font-size: 14px; }
</style>
