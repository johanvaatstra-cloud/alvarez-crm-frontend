<template>
  <div class="page">
    <div class="page-header">
      <h1>{{ t('dashboard.title') }}</h1>
      <p class="subtitle">{{ t('dashboard.welcome') }} {{ auth.fullName }}</p>
    </div>

    <!-- Stat cards -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon-wrap">
          <i class="pi pi-building" />
        </div>
        <div class="stat-body">
          <span class="stat-value">{{ stats ? stats.totalClients : '—' }}</span>
          <span class="stat-label">{{ t('dashboard.activeClients') }}</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon-wrap">
          <i class="pi pi-calendar" />
        </div>
        <div class="stat-body">
          <span class="stat-value">{{ stats ? stats.visitsThisWeek : '—' }}</span>
          <span class="stat-label">{{ t('dashboard.visitsThisWeek') }}</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon-wrap warn">
          <i class="pi pi-file" />
        </div>
        <div class="stat-body">
          <span class="stat-value">{{ stats ? stats.pendingReports : '—' }}</span>
          <span class="stat-label">{{ t('dashboard.pendingReports') }}</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon-wrap accent">
          <i class="pi pi-box" />
        </div>
        <div class="stat-body">
          <span class="stat-value">{{ stats ? stats.totalProducts : '—' }}</span>
          <span class="stat-label">{{ t('dashboard.totalProducts') }}</span>
        </div>
      </div>
    </div>

    <!-- Activity panels -->
    <div class="panels-grid">

      <!-- Upcoming visits -->
      <div class="panel">
        <div class="panel-header">
          <i class="pi pi-calendar-clock" />
          <h3>{{ t('dashboard.upcomingVisits') }}</h3>
        </div>

        <div v-if="loadingUpcoming" class="panel-loading">
          <i class="pi pi-spin pi-spinner" /> {{ t('common.loading') }}
        </div>
        <div v-else-if="upcoming.length === 0" class="panel-empty">
          {{ t('dashboard.noVisits') }}
        </div>
        <div v-else class="visit-list">
          <div v-for="v in upcoming" :key="v.id" class="visit-item" @click="router.push(`/clients/${v.clientId}`)">
            <div class="visit-date-col">
              <span class="visit-day">{{ formatDay(v.plannedDateTime) }}</span>
              <span class="visit-time">{{ formatTime(v.plannedDateTime) }}</span>
            </div>
            <div class="visit-body">
              <span class="visit-client">{{ v.clientName ?? v.clientId }}</span>
              <span class="visit-purpose">{{ v.purpose }}</span>
            </div>
            <span class="visit-dur">{{ v.estimatedDurationMinutes }} {{ t('dashboard.min') }}</span>
          </div>
        </div>
      </div>

      <!-- Recent reports -->
      <div class="panel">
        <div class="panel-header">
          <i class="pi pi-file-edit" />
          <h3>{{ t('dashboard.recentReports') }}</h3>
        </div>

        <div v-if="loadingReports" class="panel-loading">
          <i class="pi pi-spin pi-spinner" /> {{ t('common.loading') }}
        </div>
        <div v-else-if="recentReports.length === 0" class="panel-empty">
          {{ t('dashboard.noReports') }}
        </div>
        <div v-else class="report-list">
          <div v-for="r in recentReports" :key="r.id" class="report-item" @click="router.push(`/reports/${r.id}`)">
            <div class="report-left">
              <span class="report-client">{{ r.clientName ?? r.clientId }}</span>
              <div class="report-meta">
                <span class="report-date">{{ formatDay(r.visitDate) }}</span>
                <span v-if="auth.isAdmin && r.salesRepName" class="report-rep" :style="{ color: repColor(r.salesRepId) }">
                  <span class="rep-dot-small" :style="{ background: repColor(r.salesRepId) }" />
                  {{ r.salesRepName }}
                </span>
              </div>
              <p v-if="r.aiSummary" class="report-summary">{{ r.aiSummary }}</p>
            </div>
            <Tag :value="reportStatusLabel(r.status)" :severity="reportStatusSeverity(r.status)" />
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { format, parseISO } from 'date-fns'
import { nl, enGB, es, ca } from 'date-fns/locale'
import { useAuthStore } from '../stores/auth'
import api from '../api/axios'
import Tag from 'primevue/tag'

const { t, locale } = useI18n()
const auth = useAuthStore()
const router = useRouter()

const DFNS_LOCALES = { nl, en: enGB, es, ca }
const dateFnsLocale = computed(() => DFNS_LOCALES[locale.value] ?? nl)

const REP_COLORS = ['#1c7ed6', '#e64980', '#7950f2', '#f76707', '#0ca678', '#c92a2a', '#2f9e44', '#845ef7']
const repColorCache = {}
let repColorIndex = 0
function repColor(salesRepId) {
  if (!salesRepId) return '#868e96'
  if (!repColorCache[salesRepId]) repColorCache[salesRepId] = REP_COLORS[repColorIndex++ % REP_COLORS.length]
  return repColorCache[salesRepId]
}

const stats = ref(null)
const upcoming = ref([])
const recentReports = ref([])
const loadingUpcoming = ref(true)
const loadingReports = ref(true)

function formatDay(dt) { return format(parseISO(dt), 'd MMM', { locale: dateFnsLocale.value }) }
function formatTime(dt) { return format(parseISO(dt), 'HH:mm') }

const REPORT_STATUS_SEVERITY = { Uploaded: 'secondary', Transcribing: 'info', Summarized: 'success', Error: 'danger' }
function reportStatusLabel(s) {
  const keys = { Uploaded: 'reportStatus.uploaded', Transcribing: 'reportStatus.transcribingShort', Summarized: 'reportStatus.summarized', Error: 'reportStatus.error' }
  return keys[s] ? t(keys[s]) : s
}
function reportStatusSeverity(s) { return REPORT_STATUS_SEVERITY[s] ?? 'secondary' }

async function loadStats() {
  try {
    const { data } = await api.get('/dashboard/stats')
    stats.value = data.data
  } catch {
    stats.value = null
  }
}

async function loadUpcoming() {
  loadingUpcoming.value = true
  try {
    const { data } = await api.get('/dashboard/upcoming')
    upcoming.value = data.data
  } catch {
    upcoming.value = []
  } finally {
    loadingUpcoming.value = false
  }
}

async function loadRecentReports() {
  loadingReports.value = true
  try {
    const { data } = await api.get('/dashboard/recent-reports')
    recentReports.value = data.data
  } catch {
    recentReports.value = []
  } finally {
    loadingReports.value = false
  }
}

onMounted(() => { loadStats(); loadUpcoming(); loadRecentReports() })
</script>

<style scoped>
.page {
  padding: 32px;
  max-width: 1200px;
}

.page-header {
  margin-bottom: 28px;
}

.page-header h1 {
  font-size: 24px;
  font-weight: 700;
  color: var(--accent);
  margin: 0 0 4px;
}

.subtitle {
  color: var(--text-2);
  margin: 0;
  font-size: 14px;
}

/* ── Stat cards ──────────────────────────────────────────────────────────── */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: var(--card);
  border-radius: 14px;
  border-top: 1px solid var(--card-top);
  border-left: 1px solid var(--card-left);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: var(--shadow-sm);
}

.stat-icon-wrap {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  background: var(--accent-dim);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 20px;
  color: var(--accent);
}

.stat-icon-wrap.warn {
  background: rgba(251, 191, 36, 0.15);
  color: #f59e0b;
}

.stat-icon-wrap.accent {
  background: rgba(139, 92, 246, 0.15);
  color: #8b5cf6;
}

.stat-body {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 26px;
  font-weight: 700;
  color: var(--text);
  line-height: 1;
}

.stat-label {
  font-size: 12px;
  color: var(--text-2);
  margin-top: 4px;
}

/* ── Activity panels ─────────────────────────────────────────────────────── */
.panels-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

@media (max-width: 900px) {
  .panels-grid { grid-template-columns: 1fr; }
}

.panel {
  background: var(--card);
  border-radius: 14px;
  border-top: 1px solid var(--card-top);
  border-left: 1px solid var(--card-left);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  padding: 20px;
  box-shadow: var(--shadow-sm);
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--divider);
}

.panel-header i {
  color: var(--accent);
  font-size: 15px;
}

.panel-header h3 {
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-2);
  margin: 0;
}

.panel-loading,
.panel-empty {
  font-size: 13px;
  color: var(--text-3);
  text-align: center;
  padding: 24px 0;
}

/* ── Visit list ──────────────────────────────────────────────────────────── */
.visit-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.visit-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--row-hover);
  cursor: pointer;
  transition: background 0.15s;
}

.visit-item:hover {
  background: var(--accent-dim);
}

.visit-date-col {
  display: flex;
  flex-direction: column;
  min-width: 48px;
  text-align: center;
}

.visit-day {
  font-size: 12px;
  font-weight: 700;
  color: var(--accent);
}

.visit-time {
  font-size: 11px;
  color: var(--text-3);
}

.visit-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
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
  color: var(--text-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.visit-dur {
  font-size: 11px;
  color: var(--text-3);
  flex-shrink: 0;
}

/* ── Report list ─────────────────────────────────────────────────────────── */
.report-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.report-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--row-hover);
  cursor: pointer;
  transition: background 0.15s;
}

.report-item:hover {
  background: var(--accent-dim);
}

.report-left {
  flex: 1;
  min-width: 0;
}

.report-client {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  display: block;
}

.report-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 1px;
}

.report-date {
  font-size: 11px;
  color: var(--text-3);
}

.report-rep {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 500;
}

.rep-dot-small {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.report-summary {
  font-size: 12px;
  color: var(--text-2);
  margin: 4px 0 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
