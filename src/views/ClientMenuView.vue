<template>
  <div class="page" :class="isDark ? 'theme-dark' : 'theme-light'">

    <!-- ── Blob achtergronden ────────────────────────────────────────────────── -->
    <div class="blobs" aria-hidden="true">
      <div class="blob blob-1" />
      <div class="blob blob-2" />
      <div class="blob blob-3" />
    </div>

    <!-- ── Laden ─────────────────────────────────────────────────────────────── -->
    <div v-if="loading" class="page-loading">
      <i class="pi pi-spin pi-spinner" />
    </div>

    <!-- ── Fout ──────────────────────────────────────────────────────────────── -->
    <div v-else-if="error" class="page-error">
      <i class="pi pi-exclamation-triangle" />
      <p>{{ error }}</p>
      <button class="btn-ghost" @click="router.push(`/clients/${route.params.clientId}`)">
        <i class="pi pi-arrow-left" /> {{ t('common.back') }}
      </button>
    </div>

    <template v-else>
      <!-- ── Topbar ─────────────────────────────────────────────────────────── -->
      <header class="topbar">
        <button class="icon-btn" @click="router.push(`/clients/${route.params.clientId}`)">
          <i class="pi pi-arrow-left" />
        </button>
        <div class="topbar-title">
          <h1>
            <i class="ti ti-tools-kitchen-2 title-icon" />
            {{ t('menu.title') }}
            <span v-if="clientName" class="title-client">— {{ clientName }}</span>
          </h1>
        </div>
      </header>

      <!-- ── Huidige menukaart (indien aanwezig) ───────────────────────────── -->
      <div v-if="menu" class="glass-card current-card">
        <div class="card-hdr">
          <span class="card-title">{{ t('menu.currentMenu') }}</span>
          <span class="menu-type-badge" :class="menu.sourceUrl ? 'badge-url' : 'badge-pdf'">
            {{ menu.sourceUrl ? t('menu.typeUrl') : t('menu.typePdf') }}
          </span>
        </div>
        <div class="meta-row">
          <div class="meta-item">
            <i class="pi pi-clock meta-ico" />
            <span class="meta-lbl">{{ t('menu.lastUpdated') }}</span>
            <span class="meta-val">{{ formatDate(menu.fetchedAt) }}</span>
          </div>
          <div class="meta-item">
            <i class="pi pi-list meta-ico" />
            <span class="meta-lbl">{{ t('menu.dishesRecognized') }}</span>
            <span class="meta-val meta-accent">{{ menu.dishes.length }}</span>
          </div>
          <div v-if="menu.sourceUrl" class="meta-item meta-item-url">
            <i class="pi pi-link meta-ico" />
            <span class="meta-lbl">URL</span>
            <a :href="menu.sourceUrl" target="_blank" rel="noopener" class="meta-link">{{ menu.sourceUrl }}</a>
          </div>
        </div>
      </div>

      <!-- ── Succes-banner na upload/scrape ────────────────────────────────── -->
      <div v-if="justUpdated" class="success-banner glass-card">
        <div class="sb-left">
          <i class="pi pi-check-circle sb-ico" />
          <div>
            <p class="sb-title">{{ t('menu.uploadSuccess') }}</p>
            <p class="sb-sub">{{ t('menu.dishesCount', { n: menu?.dishes?.length ?? 0 }) }}</p>
          </div>
        </div>
        <button
          class="btn-generate"
          :disabled="generatingSuggestions"
          @click="generateSuggestions"
        >
          <i :class="generatingSuggestions ? 'pi pi-spin pi-spinner' : 'pi pi-sparkles'" />
          {{ t('menu.generateNow') }}
        </button>
      </div>

      <!-- ── Acties: uploaden + scrapen ────────────────────────────────────── -->
      <div class="actions-row">

        <!-- PDF uploaden -->
        <div class="glass-card action-card">
          <div class="card-hdr">
            <span class="card-title">{{ t('menu.uploadPdf') }}</span>
          </div>
          <div class="action-body">
            <p class="action-desc">{{ t('menu.uploadDesc') }}</p>
            <input ref="fileInput" type="file" accept="image/*,.pdf" style="display:none" @change="uploadMenu" />
            <button
              class="btn-action btn-upload"
              :disabled="uploading || scraping"
              @click="fileInput.click()"
            >
              <i :class="uploading ? 'pi pi-spin pi-spinner' : 'pi pi-upload'" />
              {{ uploading ? t('common.loading') : t('menu.uploadPdf') }}
            </button>
          </div>
        </div>

        <!-- URL scrapen -->
        <div class="glass-card action-card">
          <div class="card-hdr">
            <span class="card-title">{{ t('menu.scrapeUrl') }}</span>
          </div>
          <div class="action-body">
            <p class="action-desc">{{ t('menu.scrapeDesc') }}</p>
            <div class="url-row">
              <input
                v-model="menuUrl"
                type="url"
                class="url-input"
                :placeholder="t('menu.urlPlaceholder')"
                :disabled="scraping || uploading"
                @keyup.enter="scrapeMenu"
              />
              <button
                class="btn-action btn-scrape"
                :disabled="scraping || uploading || !menuUrl.trim()"
                @click="scrapeMenu"
              >
                <i :class="scraping ? 'pi pi-spin pi-spinner' : 'pi pi-globe'" />
                {{ scraping ? t('common.loading') : t('menu.scrapeUrl') }}
              </button>
            </div>
          </div>
        </div>

      </div>

      <!-- ── Gerechten & categorieën (na upload of bestaand menu) ─────────── -->
      <div v-if="menu && menu.dishes.length > 0" class="glass-card dishes-card">
        <div class="card-hdr">
          <span class="card-title">{{ t('menu.dishesTitle') }}</span>
          <span class="dishes-count-badge">{{ menu.dishes.length }} {{ t('menu.dishesUnit') }}</span>
        </div>
        <div class="dishes-body">
          <div class="dishes-grid">
            <span
              v-for="d in menu.dishes"
              :key="d"
              class="dish-chip"
            >{{ d }}</span>
          </div>
        </div>
        <div class="card-ftr">
          <button
            class="btn-generate"
            :disabled="generatingSuggestions"
            @click="generateSuggestions"
          >
            <i :class="generatingSuggestions ? 'pi pi-spin pi-spinner' : 'pi pi-sparkles'" />
            {{ generatingSuggestions ? t('common.loading') : t('menu.generateSuggestions') }}
          </button>
          <span v-if="suggestionsGenerated" class="gen-ok">
            <i class="pi pi-check" /> {{ t('menu.suggestionsGenerated') }}
          </span>
        </div>
      </div>

      <!-- ── Leeg menu ─────────────────────────────────────────────────────── -->
      <div v-else-if="!menu" class="glass-card empty-card">
        <div class="card-empty">
          <i class="ti ti-tools-kitchen-2 empty-ico" />
          <p>{{ t('menu.noMenu') }}</p>
          <span class="empty-sub">{{ t('menu.noMenuHint') }}</span>
        </div>
      </div>

    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { useI18n } from 'vue-i18n'
import { format, parseISO } from 'date-fns'
import api from '../api/axios'
import { useTheme } from '../composables/useTheme.js'

const { t } = useI18n()
const route  = useRoute()
const router = useRouter()
const toast  = useToast()
const { isDark } = useTheme()

// ── State ─────────────────────────────────────────────────────────────────────
const loading   = ref(true)
const error     = ref('')
const clientName = ref('')
const menu       = ref(null)
const menuUrl    = ref('')
const uploading  = ref(false)
const scraping   = ref(false)
const fileInput  = ref(null)
const justUpdated          = ref(false)
const generatingSuggestions = ref(false)
const suggestionsGenerated  = ref(false)

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(d) {
  if (!d) return '—'
  try { return format(parseISO(d), 'dd-MM-yyyy HH:mm') } catch { return d }
}

// ── API calls ─────────────────────────────────────────────────────────────────
async function loadData() {
  loading.value = true
  error.value   = ''
  try {
    const [clientRes, menuRes] = await Promise.allSettled([
      api.get(`/clients/${route.params.clientId}`),
      api.get(`/clients/${route.params.clientId}/menu`)
    ])
    if (clientRes.status === 'fulfilled') {
      clientName.value = clientRes.value.data.data.companyName ?? ''
    } else {
      error.value = t('clientDetail.loadError')
    }
    if (menuRes.status === 'fulfilled') {
      menu.value = menuRes.value.data.data
      if (menu.value?.sourceUrl) menuUrl.value = menu.value.sourceUrl
    }
  } catch {
    error.value = t('clientDetail.loadError')
  } finally {
    loading.value = false
  }
}

async function uploadMenu(e) {
  const file = e.target.files?.[0]
  if (!file) return
  fileInput.value.value = ''
  uploading.value    = true
  justUpdated.value  = false
  suggestionsGenerated.value = false
  try {
    const fd = new FormData()
    fd.append('file', file)
    const { data } = await api.post(
      `/clients/${route.params.clientId}/menu/upload`,
      fd,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
    menu.value       = data.data
    justUpdated.value = true
    toast.add({ severity: 'success', summary: t('menu.uploadSuccess'), detail: `${data.data.dishes.length} ${t('clientDetail.dishesFoundToast')}`, life: 4000 })
  } catch (err) {
    toast.add({ severity: 'error', summary: t('clientDetail.uploadFailed'), detail: err.response?.data?.error ?? '', life: 4000 })
  } finally {
    uploading.value = false
  }
}

async function scrapeMenu() {
  if (!menuUrl.value.trim()) return
  scraping.value     = true
  justUpdated.value  = false
  suggestionsGenerated.value = false
  try {
    const { data } = await api.post(
      `/clients/${route.params.clientId}/menu/scrape`,
      { url: menuUrl.value.trim() }
    )
    menu.value       = data.data
    justUpdated.value = true
    toast.add({ severity: 'success', summary: t('clientDetail.menuScraped'), detail: `${data.data.dishes.length} ${t('clientDetail.dishesFoundToast')}`, life: 4000 })
  } catch (err) {
    toast.add({ severity: 'error', summary: t('clientDetail.scrapeFailed'), detail: err.response?.data?.error ?? '', life: 4000 })
  } finally {
    scraping.value = false
  }
}

async function generateSuggestions() {
  generatingSuggestions.value  = true
  suggestionsGenerated.value   = false
  try {
    const { data } = await api.post(`/clients/${route.params.clientId}/suggestions/generate`, {})
    suggestionsGenerated.value = true
    justUpdated.value          = false
    toast.add({ severity: 'success', summary: t('clientDetail.adviceGenerated'), detail: `${data.data.length} ${t('clientDetail.adviceItems')}`, life: 4000 })
  } catch (err) {
    toast.add({ severity: 'error', summary: t('clientDetail.generateFailed'), detail: err.response?.data?.error ?? '', life: 4000 })
  } finally {
    generatingSuggestions.value = false
  }
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────
onMounted(loadData)
</script>

<style scoped>
/* ── Basis & variabelen ───────────────────────────────────────────────────── */
.page {
  min-height: 100vh;
  padding: 24px 28px 48px;
  max-width: 1100px;
  margin: 0 auto;
  position: relative;
  font-size: 14px;
}

/* Donker thema */
.theme-dark {
  --bg:         #0f1923;
  --card:       rgba(255,255,255,0.07);
  --card-top:   rgba(255,255,255,0.22);
  --card-left:  rgba(255,255,255,0.10);
  --border:     rgba(255,255,255,0.06);
  --text:       rgba(255,255,255,0.92);
  --muted:      rgba(255,255,255,0.45);
  --dim:        rgba(255,255,255,0.22);
  --accent:     #4ade80;
  --accent-dim: rgba(74,222,128,0.15);
  --divider:    rgba(255,255,255,0.07);
  --btn:        rgba(255,255,255,0.10);
  --btn-hover:  rgba(255,255,255,0.17);
  --btn-border: rgba(255,255,255,0.14);
  --shadow:     0 8px 32px rgba(0,0,0,0.45);
  --inp:        rgba(255,255,255,0.08);
  --inp-border: rgba(255,255,255,0.14);
  background:   #0f1923;
  color:        rgba(255,255,255,0.92);
}

/* Licht thema */
.theme-light {
  --bg:         transparent;
  --card:       rgba(255,255,255,0.68);
  --card-top:   rgba(255,255,255,0.97);
  --card-left:  rgba(255,255,255,0.85);
  --border:     rgba(0,0,0,0.05);
  --text:       #1a2e1a;
  --muted:      #6c757d;
  --dim:        #adb5bd;
  --accent:     #2d6a4f;
  --accent-dim: rgba(45,106,79,0.10);
  --divider:    rgba(0,0,0,0.06);
  --btn:        rgba(45,106,79,0.08);
  --btn-hover:  rgba(45,106,79,0.14);
  --btn-border: rgba(45,106,79,0.18);
  --shadow:     0 2px 16px rgba(0,0,0,0.07);
  --inp:        rgba(255,255,255,0.9);
  --inp-border: rgba(0,0,0,0.12);
  background:   linear-gradient(135deg, #e8f5ee 0%, #f0f4ff 100%);
  background-attachment: fixed;
  color:        #1a2e1a;
}

/* ── Blobs ────────────────────────────────────────────────────────────────── */
.blobs { position: fixed; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }
.blob  { position: absolute; border-radius: 50%; filter: blur(72px); opacity: 0; transition: opacity .4s; }
.theme-dark .blob { opacity: 1; }
.blob-1 { width: 500px; height: 500px; top: -100px; right: -60px;  background: radial-gradient(circle, rgba(74,222,128,0.25) 0%, transparent 68%); }
.blob-2 { width: 420px; height: 420px; bottom: 12%; left: -80px;   background: radial-gradient(circle, rgba(34,211,238,0.20) 0%, transparent 68%); }
.blob-3 { width: 360px; height: 360px; top: 50%;    right: 20%;    background: radial-gradient(circle, rgba(167,139,250,0.15) 0%, transparent 68%); }

.page > *:not(.blobs) { position: relative; z-index: 1; }

/* ── Laad / fout ─────────────────────────────────────────────────────────── */
.page-loading {
  display: flex; justify-content: center; align-items: center;
  height: 40vh; font-size: 28px; color: var(--muted);
}
.page-error {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 12px; height: 40vh; color: var(--muted);
}
.page-error i { font-size: 40px; color: #f87171; }
.page-error p  { margin: 0; font-size: 15px; }

/* ── Topbar ──────────────────────────────────────────────────────────────── */
.topbar {
  display: flex; align-items: center; gap: 16px;
  margin-bottom: 24px; flex-wrap: wrap;
}
.topbar-title { flex: 1; min-width: 0; }
.topbar-title h1 {
  margin: 0; font-size: 22px; font-weight: 700; color: var(--text);
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
}
.title-icon  { font-size: 20px; color: var(--accent); }
.title-client { font-weight: 400; color: var(--muted); font-size: 18px; }

.icon-btn {
  width: 36px; height: 36px;
  border: 1px solid var(--btn-border);
  background: var(--btn); color: var(--text);
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; font-size: 14px;
  transition: background .15s; flex-shrink: 0;
}
.icon-btn:hover { background: var(--btn-hover); }

/* ── Glassmorphism kaart ─────────────────────────────────────────────────── */
.glass-card {
  background: var(--card);
  border-radius: 14px;
  border-top:    1px solid var(--card-top);
  border-left:   1px solid var(--card-left);
  border-right:  1px solid var(--border);
  border-bottom: 1px solid var(--border);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: var(--shadow);
  overflow: hidden;
  margin-bottom: 16px;
}

/* ── Kaart header / footer ───────────────────────────────────────────────── */
.card-hdr {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 18px 10px;
  border-bottom: 1px solid var(--divider); gap: 8px;
}
.card-title {
  font-size: 11px; font-weight: 700; letter-spacing: .7px;
  text-transform: uppercase; color: var(--muted);
}
.card-ftr {
  padding: 12px 18px 16px;
  border-top: 1px solid var(--divider);
  display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
}
.card-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 12px; padding: 52px 20px; color: var(--dim); text-align: center;
}
.empty-ico  { font-size: 40px; color: var(--muted); }
.card-empty p   { margin: 0; font-size: 15px; font-weight: 500; color: var(--text); }
.empty-sub      { font-size: 13px; color: var(--muted); }

/* ── Type badge ──────────────────────────────────────────────────────────── */
.menu-type-badge {
  font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px;
  padding: 2px 9px; border-radius: 10px;
}
.badge-url { background: rgba(96,165,250,0.18); color: #60a5fa; }
.badge-pdf { background: rgba(251,191,36,0.18);  color: #fbbf24; }

/* ── Meta rij (huidige kaart) ────────────────────────────────────────────── */
.meta-row {
  display: flex; flex-wrap: wrap; border-bottom: 0;
}
.meta-item {
  display: flex; align-items: center; gap: 8px;
  padding: 12px 18px; flex: 1; min-width: 180px;
  border-right: 1px solid var(--divider);
  border-bottom: 1px solid var(--divider);
}
.meta-item:last-child { border-right: none; }
.meta-item-url { flex-basis: 100%; border-right: none; }
.meta-ico    { font-size: 13px; color: var(--muted); flex-shrink: 0; }
.meta-lbl    { font-size: 12px; color: var(--muted); }
.meta-val    { font-size: 13px; font-weight: 600; color: var(--text); margin-left: auto; }
.meta-accent { color: var(--accent) !important; }
.meta-link   {
  font-size: 12px; color: var(--accent); text-decoration: none;
  margin-left: auto; max-width: 60%; overflow: hidden;
  text-overflow: ellipsis; white-space: nowrap;
}
.meta-link:hover { text-decoration: underline; }

/* ── Succes-banner ───────────────────────────────────────────────────────── */
.success-banner {
  display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px;
  padding: 18px 22px;
  background: rgba(74,222,128,0.10) !important;
  border-top-color: rgba(74,222,128,0.40) !important;
  border-left-color: rgba(74,222,128,0.25) !important;
}
.theme-light .success-banner {
  background: rgba(45,106,79,0.08) !important;
  border-top-color: rgba(45,106,79,0.30) !important;
  border-left-color: rgba(45,106,79,0.20) !important;
}
.sb-left { display: flex; align-items: center; gap: 14px; }
.sb-ico  { font-size: 26px; color: var(--accent); flex-shrink: 0; }
.sb-title { margin: 0 0 2px; font-size: 14px; font-weight: 700; color: var(--accent); }
.sb-sub   { margin: 0; font-size: 12px; color: var(--muted); }

/* ── Actie-kaarten rij ───────────────────────────────────────────────────── */
.actions-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}
@media (max-width: 720px) { .actions-row { grid-template-columns: 1fr; } }

.action-body {
  padding: 18px;
  display: flex; flex-direction: column; gap: 14px;
}
.action-desc { margin: 0; font-size: 13px; color: var(--muted); line-height: 1.55; }

.btn-action {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  padding: 10px 20px;
  border-radius: 10px; cursor: pointer; font-size: 13px; font-weight: 600;
  transition: background .15s, opacity .15s;
  border: 1px solid transparent;
  align-self: flex-start;
}
.btn-action:disabled { opacity: .4; cursor: not-allowed; }

.btn-upload {
  background: rgba(251,191,36,0.15);
  border-color: rgba(251,191,36,0.40);
  color: #fbbf24;
}
.btn-upload:hover:not(:disabled) { background: rgba(251,191,36,0.25); }

.btn-scrape {
  background: var(--accent-dim);
  border-color: var(--accent);
  color: var(--accent);
  white-space: nowrap;
}
.btn-scrape:hover:not(:disabled) { background: rgba(74,222,128,0.22); }
.theme-light .btn-scrape:hover:not(:disabled) { background: rgba(45,106,79,0.18); }

/* ── URL invoer ──────────────────────────────────────────────────────────── */
.url-row {
  display: flex; gap: 8px; flex-wrap: wrap; align-items: center;
}
.url-input {
  flex: 1; min-width: 180px;
  padding: 9px 12px;
  background: var(--inp);
  border: 1px solid var(--inp-border);
  border-radius: 8px;
  color: var(--text);
  font-size: 13px;
  outline: none;
  transition: border-color .15s;
}
.url-input:focus { border-color: var(--accent); }
.url-input::placeholder { color: var(--dim); }
.url-input:disabled { opacity: .5; cursor: not-allowed; }

/* ── Gerechten kaart ─────────────────────────────────────────────────────── */
.dishes-count-badge {
  font-size: 11px; font-weight: 700;
  padding: 3px 10px; border-radius: 10px;
  background: var(--accent-dim); color: var(--accent);
  border: 1px solid var(--accent);
}
.dishes-body { padding: 16px 18px; }
.dishes-grid { display: flex; flex-wrap: wrap; gap: 7px; }
.dish-chip {
  font-size: 12px; padding: 4px 11px;
  background: var(--btn); border: 1px solid var(--btn-border);
  color: var(--text); border-radius: 12px;
  transition: background .12s;
}
.dish-chip:hover { background: var(--btn-hover); }

/* ── Suggesties knop & bevestiging ───────────────────────────────────────── */
.btn-generate {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 9px 20px;
  background: var(--accent-dim);
  border: 1px solid var(--accent);
  color: var(--accent);
  border-radius: 10px; cursor: pointer;
  font-size: 13px; font-weight: 600;
  transition: background .15s;
}
.btn-generate:hover:not(:disabled) { background: rgba(74,222,128,0.22); }
.theme-light .btn-generate:hover:not(:disabled) { background: rgba(45,106,79,0.18); }
.btn-generate:disabled { opacity: .4; cursor: not-allowed; }

.gen-ok {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 12px; color: var(--accent); font-weight: 600;
}

/* ── Ghost knop ──────────────────────────────────────────────────────────── */
.btn-ghost {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 16px;
  background: var(--btn); border: 1px solid var(--btn-border);
  color: var(--text); border-radius: 8px;
  cursor: pointer; font-size: 13px; transition: background .15s;
}
.btn-ghost:hover { background: var(--btn-hover); }
</style>
