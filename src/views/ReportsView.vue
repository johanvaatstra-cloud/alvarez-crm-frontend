<template>
  <div class="page">
    <div class="page-header">
      <h1>{{ t('reportsView.title') }}</h1>
    </div>

    <!-- Filters -->
    <div class="filters">
      <div class="filter-group">
        <label>{{ t('reportsView.filterFrom') }}</label>
        <input type="date" v-model="filterFrom" class="date-input" />
      </div>
      <div class="filter-group">
        <label>{{ t('reportsView.filterTo') }}</label>
        <input type="date" v-model="filterTo" class="date-input" />
      </div>
      <div v-if="auth.isAdmin" class="filter-group">
        <label>{{ t('reportsView.filterRep') }}</label>
        <select v-model="filterRep" class="rep-select">
          <option value="">{{ t('reportsView.allReps') }}</option>
          <option v-for="rep in reps" :key="rep.id" :value="rep.id">{{ rep.fullName }}</option>
        </select>
      </div>
      <button class="btn-clear" @click="clearFilters" v-if="filterFrom || filterTo || filterRep">
        <i class="pi pi-times" /> {{ t('common.cancel') }}
      </button>
    </div>

    <!-- List -->
    <div v-if="loading" class="loading-state">
      <i class="pi pi-spin pi-spinner" /> {{ t('common.loading') }}
    </div>
    <div v-else-if="reports.length === 0" class="empty-state">
      <i class="pi pi-file" />
      <p>{{ t('reportsView.noReports') }}</p>
    </div>
    <div v-else class="report-table">
      <div class="table-header">
        <span>{{ t('clients.companyName') }}</span>
        <span v-if="auth.isAdmin">{{ t('reportsView.salesRep') }}</span>
        <span>{{ t('common.date') }}</span>
        <span>{{ t('common.status') }}</span>
        <span></span>
      </div>
      <div
        v-for="r in reports"
        :key="r.id"
        class="table-row"
        @click="router.push(`/reports/${r.id}`)"
      >
        <span class="cell-client">{{ r.clientName ?? r.clientId }}</span>
        <span v-if="auth.isAdmin" class="cell-rep">
          <span class="rep-dot" :style="{ background: repColor(r.salesRepId) }" />
          <span :style="{ color: repColor(r.salesRepId) }">{{ r.salesRepName ?? '—' }}</span>
        </span>
        <span class="cell-date">{{ formatDate(r.visitDate) }}</span>
        <span class="cell-status">
          <Tag :value="statusLabel(r.status)" :severity="statusSeverity(r.status)" />
        </span>
        <span class="cell-arrow"><i class="pi pi-chevron-right" /></span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { format, parseISO } from 'date-fns'
import { nl, enGB, es, ca } from 'date-fns/locale'
import Tag from 'primevue/tag'
import { useAuthStore } from '../stores/auth'
import api from '../api/axios'

const { t, locale } = useI18n()
const auth = useAuthStore()
const router = useRouter()

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

const filterFrom = ref('')
const filterTo = ref('')
const filterRep = ref('')
const reports = ref([])
const reps = ref([])
const loading = ref(false)

function formatDate(dt) {
  return format(parseISO(dt), 'd MMM yyyy', { locale: dateFnsLocale.value })
}

const STATUS_SEVERITY = { Uploaded: 'secondary', Transcribing: 'info', Summarized: 'success', Error: 'danger' }
function statusLabel(s) {
  const keys = { Uploaded: 'reportStatus.uploaded', Transcribing: 'reportStatus.transcribingShort', Summarized: 'reportStatus.summarized', Error: 'reportStatus.error' }
  return keys[s] ? t(keys[s]) : s
}
function statusSeverity(s) { return STATUS_SEVERITY[s] ?? 'secondary' }

function clearFilters() {
  filterFrom.value = ''
  filterTo.value = ''
  filterRep.value = ''
}

async function loadReports() {
  loading.value = true
  try {
    const params = {}
    if (filterFrom.value) params.fromDate = filterFrom.value
    if (filterTo.value) params.toDate = filterTo.value
    if (filterRep.value) params.salesRepId = filterRep.value
    const { data } = await api.get('/reports', { params })
    reports.value = data.data
  } catch {
    reports.value = []
  } finally {
    loading.value = false
  }
}

async function loadReps() {
  if (!auth.isAdmin) return
  try {
    const { data } = await api.get('/admin/users')
    reps.value = data.data
  } catch {
    reps.value = []
  }
}

watch([filterFrom, filterTo, filterRep], loadReports)
onMounted(() => { loadReps(); loadReports() })
</script>

<style scoped>
.page {
  padding: 32px;
  max-width: 1100px;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h1 {
  font-size: 24px;
  font-weight: 700;
  color: #1b4332;
  margin: 0;
}

/* ── Filters ─────────────────────────────────────────────────────────────── */
.filters {
  display: flex;
  align-items: flex-end;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 24px;
  padding: 16px 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.filter-group label {
  font-size: 11px;
  font-weight: 600;
  color: #6c757d;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.date-input,
.rep-select {
  height: 36px;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 0 10px;
  font-size: 13px;
  color: #212529;
  background: #f8f9fa;
  outline: none;
  transition: border-color 0.15s;
}

.date-input:focus,
.rep-select:focus {
  border-color: #2d6a4f;
  background: white;
}

.rep-select { min-width: 160px; }

.btn-clear {
  height: 36px;
  padding: 0 12px;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  background: white;
  font-size: 12px;
  color: #6c757d;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: background 0.15s, color 0.15s;
  align-self: flex-end;
}

.btn-clear:hover {
  background: #f8d7da;
  color: #842029;
  border-color: #f5c6cb;
}

/* ── States ──────────────────────────────────────────────────────────────── */
.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 60px 0;
  color: #adb5bd;
  font-size: 14px;
}

.empty-state i {
  font-size: 32px;
}

/* ── Table ───────────────────────────────────────────────────────────────── */
.report-table {
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  overflow: hidden;
}

.table-header {
  display: grid;
  grid-template-columns: 1fr 160px 110px 130px 32px;
  padding: 10px 16px;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
  font-size: 11px;
  font-weight: 600;
  color: #6c757d;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.table-header:has(> span:nth-child(2):not(:nth-last-child(4))) {
  grid-template-columns: 1fr 110px 130px 32px;
}

.table-row {
  display: grid;
  grid-template-columns: 1fr 160px 110px 130px 32px;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #f1f3f5;
  cursor: pointer;
  transition: background 0.15s;
}

.table-row:last-child {
  border-bottom: none;
}

.table-row:hover {
  background: #e9f5ee;
}

.cell-client {
  font-size: 13px;
  font-weight: 600;
  color: #212529;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cell-rep {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
}

.rep-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.cell-date {
  font-size: 12px;
  color: #495057;
}

.cell-status {
  display: flex;
}

.cell-arrow {
  color: #adb5bd;
  font-size: 12px;
  text-align: right;
}
</style>
