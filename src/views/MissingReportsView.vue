<template>
  <div class="page">
    <div class="page-header">
      <h1>{{ t('missingReports.title') }}</h1>
      <p class="subtitle">{{ t('missingReports.subtitle') }}</p>
    </div>

    <div v-if="loading" class="loading-state">
      <i class="pi pi-spin pi-spinner" /> {{ t('common.loading') }}
    </div>
    <div v-else-if="visits.length === 0" class="empty-state">
      <i class="pi pi-check-circle" />
      <p>{{ t('missingReports.noMissing') }}</p>
    </div>
    <template v-else>
      <!-- Admin: grouped by rep -->
      <template v-if="auth.isAdmin">
        <div v-for="rep in groupedByRep" :key="rep.id" class="rep-section">
          <div class="rep-header">
            <span class="rep-dot" :style="{ background: rep.color }" />
            <span class="rep-name" :style="{ color: rep.color }">{{ rep.name }}</span>
            <span class="rep-count">{{ rep.visits.length }}</span>
          </div>
          <div class="visit-table">
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

      <!-- Sales rep: flat list -->
      <div v-else class="visit-table solo">
        <div
          v-for="v in visits"
          :key="v.id"
          class="visit-row"
          style="border-left-color: #2d6a4f"
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

    <!-- New report dialog -->
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
import { format, parseISO } from 'date-fns'
import { nl, enGB, es, ca } from 'date-fns/locale'
import { useAuthStore } from '../stores/auth'
import api from '../api/axios'
import ReportFormDialog from '../components/ReportFormDialog.vue'

const { t, locale } = useI18n()
const auth = useAuthStore()

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
.page {
  padding: 32px;
  max-width: 900px;
}

.page-header {
  margin-bottom: 28px;
}

.page-header h1 {
  font-size: 24px;
  font-weight: 700;
  color: #1b4332;
  margin: 0 0 4px;
}

.subtitle {
  color: #6c757d;
  font-size: 14px;
  margin: 0;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 60px 0;
  color: #adb5bd;
  font-size: 14px;
}

.empty-state i {
  font-size: 36px;
  color: #40c057;
}

/* ── Rep section ─────────────────────────────────────────────────────────── */
.rep-section {
  margin-bottom: 24px;
}

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
  background: #f1f3f5;
  color: #495057;
  border-radius: 20px;
  padding: 1px 8px;
}

/* ── Visit table ─────────────────────────────────────────────────────────── */
.visit-table {
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  overflow: hidden;
}

.visit-table.solo {
  margin-top: 0;
}

.visit-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  border-left: 3px solid #dee2e6;
  border-bottom: 1px solid #f1f3f5;
  transition: background 0.15s;
}

.visit-row:last-child {
  border-bottom: none;
}

.visit-row:hover {
  background: #f8f9fa;
}

.visit-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.visit-client {
  font-size: 13px;
  font-weight: 600;
  color: #212529;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.visit-purpose {
  font-size: 12px;
  color: #6c757d;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.visit-date {
  font-size: 12px;
  color: #868e96;
  flex-shrink: 0;
  min-width: 90px;
  text-align: right;
}

.btn-create {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border: 1px solid #2d6a4f;
  border-radius: 8px;
  background: white;
  color: #2d6a4f;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.btn-create:hover {
  background: #2d6a4f;
  color: white;
}
</style>
