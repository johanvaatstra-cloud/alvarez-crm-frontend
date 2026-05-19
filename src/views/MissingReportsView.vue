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
      <h1>{{ t('missingReports.title') }}</h1>
      <p class="subtitle">{{ t('missingReports.subtitle') }}</p>
    </div>

    <div v-if="loading" class="state-card">
      <i class="pi pi-spin pi-spinner" />
      <p>{{ t('common.loading') }}</p>
    </div>
    <div v-else-if="visits.length === 0" class="state-card state-ok">
      <i class="pi pi-check-circle" />
      <p>{{ t('missingReports.noMissing') }}</p>
    </div>

    <template v-else>
      <!-- Admin: gegroepeerd per rep -->
      <template v-if="auth.isAdmin">
        <div v-for="rep in groupedByRep" :key="rep.id" class="rep-section">
          <div class="rep-header">
            <span class="rep-dot" :style="{ background: rep.color }" />
            <span class="rep-name" :style="{ color: rep.color }">{{ rep.name }}</span>
            <span class="rep-count">{{ rep.visits.length }}</span>
          </div>
          <div class="glass-card visit-table">
            <div
              v-for="v in rep.visits"
              :key="v.id"
              class="visit-row"
              :style="{ borderLeftColor: rep.color }"
            >
              <div class="visit-info">
                <span class="visit-client">{{ v.clientName ?? v.clientId }}</span>
                <span class="visit-purpose">{{ v.purpose }}</span>
              </div>
              <span class="visit-date">{{ formatDate(v.plannedDateTime) }}</span>
              <button v-if="!auth.isAdmin" class="btn-create" @click.stop="createReport(v)">
                <i class="pi pi-plus" /> {{ t('missingReports.createReport') }}
              </button>
            </div>
          </div>
        </div>
      </template>

      <!-- SalesRep: platte lijst -->
      <div v-else class="glass-card visit-table">
        <div
          v-for="v in visits"
          :key="v.id"
          class="visit-row"
          style="border-left-color: var(--accent)"
        >
          <div class="visit-info">
            <span class="visit-client">{{ v.clientName ?? v.clientId }}</span>
            <span class="visit-purpose">{{ v.purpose }}</span>
          </div>
          <span class="visit-date">{{ formatDate(v.plannedDateTime) }}</span>
          <button class="btn-create" @click.stop="createReport(v)">
            <i class="pi pi-plus" /> {{ t('missingReports.createReport') }}
          </button>
        </div>
      </div>
    </template>

    <!-- Nieuw verslag dialoog -->
    <ReportFormDialog
      v-model="showReportDialog"
      :fixed-client-id="prefillClientId"
      :prefill-visit-id="prefillVisitId"
      :prefill-date="prefillDate"
      @saved="onReportCreated"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTheme } from '../composables/useTheme.js'
import { format, parseISO } from 'date-fns'
import { nl, enGB, es, ca } from 'date-fns/locale'
import { useAuthStore } from '../stores/auth'
import api from '../api/axios'
import ReportFormDialog from '../components/ReportFormDialog.vue'

const { t, locale } = useI18n()
const auth = useAuthStore()
const { isDark } = useTheme()

const DFNS_LOCALES = { nl, en: enGB, es, ca }
const dateFnsLocale = computed(() => DFNS_LOCALES[locale.value] ?? nl)

const REP_COLORS = ['#1c7ed6', '#e64980', '#7950f2', '#f76707', '#0ca678', '#c92a2a', '#2f9e44', '#845ef7']
const repColorCache = {}
let repColorIndex = 0
function repColor(id) {
  if (!id) return '#868e96'
  if (!repColorCache[id]) repColorCache[id] = REP_COLORS[repColorIndex++ % REP_COLORS.length]
  return repColorCache[id]
}

const visits = ref([])
const loading = ref(false)

const showReportDialog = ref(false)
const prefillClientId = ref(null)
const prefillVisitId = ref(null)
const prefillDate = ref(null)

function formatDate(dt) {
  return format(parseISO(dt), 'd MMM yyyy', { locale: dateFnsLocale.value })
}

const groupedByRep = computed(() => {
  const map = {}
  for (const v of visits.value) {
    const id = v.salesRepId ?? 'unknown'
    if (!map[id]) {
      map[id] = {
        id,
        name: v.salesRepName ?? id,
        color: repColor(id),
        visits: []
      }
    }
    map[id].visits.push(v)
  }
  return Object.values(map)
})

function createReport(visit) {
  prefillClientId.value = visit.clientId
  prefillVisitId.value = visit.id
  prefillDate.value = visit.plannedDateTime.slice(0, 10)
  showReportDialog.value = true
}

function onReportCreated() {
  showReportDialog.value = false
  loadMissing()
}

async function loadMissing() {
  loading.value = true
  try {
    const { data } = await api.get('/reports/missing')
    visits.value = data.data
  } catch {
    visits.value = []
  } finally {
    loading.value = false
  }
}

onMounted(loadMissing)
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
  --row-hover:  rgba(255,255,255,0.05);
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
  --row-hover:  rgba(45,106,79,0.04);
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
.page { padding: 32px; max-width: 900px; min-height: 100vh; }

.page-header { margin-bottom: 28px; }
.page-header h1 { font-size: 24px; font-weight: 700; color: var(--text); margin: 0 0 4px; }
.subtitle { color: var(--muted); font-size: 14px; margin: 0; }

/* ── Laden / leeg staat ──────────────────────────────────────────────────── */
.state-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 60px 0;
  color: var(--muted);
  font-size: 14px;
}

.state-card i { font-size: 36px; }
.state-ok i { color: var(--accent); }
.state-card p { margin: 0; }

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
}

/* ── Rep sectie ──────────────────────────────────────────────────────────── */
.rep-section { margin-bottom: 24px; }

.rep-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.rep-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.rep-name {
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.rep-count {
  font-size: 12px;
  font-weight: 600;
  background: var(--accent-dim);
  color: var(--accent);
  border-radius: 20px;
  padding: 1px 8px;
  border: 1px solid rgba(74,222,128,0.2);
}

/* ── Bezoek tabel ────────────────────────────────────────────────────────── */
.visit-table { overflow: hidden; padding: 0; }

.visit-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  border-left: 3px solid var(--border);
  border-bottom: 1px solid var(--border);
  transition: background 0.15s;
}

.visit-row:last-child { border-bottom: none; }
.visit-row:hover { background: var(--row-hover); }

.visit-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.visit-client {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.visit-purpose {
  font-size: 12px;
  color: var(--muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.visit-date {
  font-size: 12px;
  color: var(--muted);
  flex-shrink: 0;
  min-width: 90px;
  text-align: right;
}

/* ── Verslag aanmaken knop ───────────────────────────────────────────────── */
.btn-create {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border: 1px solid var(--accent);
  border-radius: 8px;
  background: var(--accent-dim);
  color: var(--accent);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-create:hover { background: rgba(74,222,128,0.25); }
</style>
