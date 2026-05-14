<template>
  <div class="page">
    <div class="page-header">
      <div class="header-left">
        <h1>{{ t('agenda.title') }}</h1>
        <p class="subtitle">{{ t('agenda.subtitle') }}</p>
      </div>
      <div class="header-right">
        <Button v-if="!isAdmin" :label="t('agenda.planVisit')" icon="pi pi-plus" @click="showForm = true" />
      </div>
    </div>

    <!-- Week navigation -->
    <div class="week-nav">
      <Button icon="pi pi-chevron-left" severity="secondary" text rounded @click="prevWeek" />
      <span class="week-label">{{ weekLabel }}</span>
      <Button icon="pi pi-chevron-right" severity="secondary" text rounded @click="nextWeek" />
      <Button :label="t('agenda.today')" severity="secondary" text @click="goToday" class="today-btn" />

      <!-- Rep legend (admin only) -->
      <div v-if="isAdmin && repLegend.length > 0" class="rep-legend">
        <div v-for="rep in repLegend" :key="rep.id" class="rep-badge" :style="{ background: rep.color + '22', borderColor: rep.color }">
          <span class="rep-dot" :style="{ background: rep.color }" />
          <span>{{ rep.name }}</span>
        </div>
      </div>
    </div>

    <!-- Week grid -->
    <div class="week-grid">
      <div
        v-for="day in weekDays"
        :key="day.iso"
        class="day-col"
        :class="{ today: day.isToday }"
      >
        <div class="day-header">
          <span class="day-name">{{ day.name }}</span>
          <span class="day-num" :class="{ today: day.isToday }">{{ day.num }}</span>
        </div>

        <div class="day-body">
          <div v-if="loading" class="skeleton-card" v-for="n in 1" :key="n" />

          <div
            v-else-if="visitsForDay(day.iso).length === 0"
            class="no-visits"
          >—</div>

          <div
            v-else
            v-for="visit in visitsForDay(day.iso)"
            :key="visit.id"
            class="visit-card"
            :class="!isAdmin ? statusClass(visit.status) : ''"
            :style="isAdmin ? repCardStyle(visit.salesRepId) : {}"
            @click="handleVisitClick(visit)"
          >
            <div class="visit-time">{{ formatTime(visit.plannedDateTime) }}</div>
            <div v-if="isAdmin" class="visit-rep">{{ visit.salesRepName }}</div>
            <div class="visit-client">{{ visit.clientName }}</div>
            <div class="visit-purpose">{{ visit.purpose }}</div>
            <div class="visit-meta">
              <span class="visit-dur">{{ visit.estimatedDurationMinutes }} min</span>
              <Tag :value="statusLabel(visit.status)" :severity="statusSeverity(visit.status)" class="visit-tag" />
            </div>
            <div v-if="!isAdmin" class="visit-actions">
              <Button
                v-if="visit.status === 'Scheduled'"
                icon="pi pi-check"
                size="small"
                severity="success"
                text
                v-tooltip.top="t('agenda.markCompleted')"
                @click.stop="changeStatus(visit, 'Completed')"
              />
              <Button
                v-if="visit.status === 'Scheduled'"
                icon="pi pi-times"
                size="small"
                severity="danger"
                text
                v-tooltip.top="t('agenda.markCancelled')"
                @click.stop="cancelVisit(visit)"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Plan / edit form (sales rep only) -->
    <VisitFormDialog v-if="!isAdmin" v-model="showForm" @saved="load" />
    <VisitFormDialog v-if="!isAdmin" v-model="showEdit" :edit-visit="editVisit" @saved="load" />

    <!-- Admin read-only visit detail dialog -->
    <Dialog
      v-if="isAdmin"
      v-model:visible="showDetail"
      :header="t('agenda.visitDetails')"
      :style="{ width: '420px' }"
      modal
    >
      <div v-if="detailVisit" class="detail-body">
        <div class="detail-row">
          <span class="detail-label">{{ t('agenda.employee') }}</span>
          <span class="detail-value">{{ detailVisit.salesRepName }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">{{ t('agenda.client') }}</span>
          <span class="detail-value">{{ detailVisit.clientName }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">{{ t('agenda.dateTime') }}</span>
          <span class="detail-value">{{ formatDetailDate(detailVisit.plannedDateTime) }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">{{ t('agenda.estimatedDuration') }}</span>
          <span class="detail-value">{{ detailVisit.estimatedDurationMinutes }} min</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">{{ t('common.status') }}</span>
          <Tag :value="statusLabel(detailVisit.status)" :severity="statusSeverity(detailVisit.status)" />
        </div>
        <div class="detail-row detail-purpose">
          <span class="detail-label">{{ t('agenda.purpose') }}</span>
          <span class="detail-value purpose-text">{{ detailVisit.purpose }}</span>
        </div>
      </div>
      <template #footer>
        <Button :label="t('common.close')" severity="secondary" text @click="showDetail = false" />
        <Button
          :label="t('agenda.toSuggestions')"
          icon="pi pi-star"
          @click="goToSuggestions"
        />
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks,
  format, isToday, parseISO, isSameDay
} from 'date-fns'
import { nl, enGB, es, ca } from 'date-fns/locale'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Dialog from 'primevue/dialog'
import VisitFormDialog from '../components/VisitFormDialog.vue'
import api from '../api/axios'
import { useAuthStore } from '../stores/auth'

const { t, locale } = useI18n()
const { isAdmin } = useAuthStore()

const DFNS_LOCALES = { nl, en: enGB, es, ca }
const dateFnsLocale = computed(() => DFNS_LOCALES[locale.value] ?? nl)
const router = useRouter()

const weekStart = ref(startOfWeek(new Date(), { weekStartsOn: 1 }))
const visits = ref([])
const loading = ref(false)
const showForm = ref(false)
const showEdit = ref(false)
const editVisit = ref(null)
const showDetail = ref(false)
const detailVisit = ref(null)

const REP_COLORS = ['#1c7ed6', '#e64980', '#7950f2', '#f76707', '#0ca678', '#c92a2a', '#2f9e44', '#845ef7']

const repColorMap = computed(() => {
  const repIds = [...new Set(visits.value.map(v => v.salesRepId).filter(Boolean))]
  return Object.fromEntries(repIds.map((id, i) => [id, REP_COLORS[i % REP_COLORS.length]]))
})

const repLegend = computed(() => {
  const seen = new Set()
  return visits.value
    .filter(v => v.salesRepId && !seen.has(v.salesRepId) && seen.add(v.salesRepId))
    .map(v => ({ id: v.salesRepId, name: v.salesRepName ?? v.salesRepId, color: repColorMap.value[v.salesRepId] }))
})

function repCardStyle(salesRepId) {
  const color = repColorMap.value[salesRepId]
  if (!color) return {}
  return { borderLeftColor: color, background: color + '18' }
}

const weekDays = computed(() => {
  const days = eachDayOfInterval({
    start: weekStart.value,
    end: endOfWeek(weekStart.value, { weekStartsOn: 1 })
  })
  return days.map(d => ({
    iso: format(d, 'yyyy-MM-dd'),
    name: format(d, 'EEE', { locale: dateFnsLocale.value }),
    num: format(d, 'd'),
    isToday: isToday(d)
  }))
})

const weekLabel = computed(() => {
  const s = weekStart.value
  const e = endOfWeek(s, { weekStartsOn: 1 })
  return `${format(s, 'd MMM', { locale: dateFnsLocale.value })} – ${format(e, 'd MMM yyyy', { locale: dateFnsLocale.value })}`
})

function prevWeek() { weekStart.value = subWeeks(weekStart.value, 1); load() }
function nextWeek() { weekStart.value = addWeeks(weekStart.value, 1); load() }
function goToday() { weekStart.value = startOfWeek(new Date(), { weekStartsOn: 1 }); load() }

function visitsForDay(iso) {
  return visits.value.filter(v => {
    const d = parseISO(v.plannedDateTime)
    return isSameDay(d, parseISO(iso))
  })
}

function formatTime(dt) {
  return format(parseISO(dt), 'HH:mm')
}

function formatDetailDate(dt) {
  return format(parseISO(dt), 'EEEE d MMMM yyyy HH:mm', { locale: dateFnsLocale.value })
}

const STATUS_LABEL_KEYS = { Scheduled: 'agenda.statusPlanned', Completed: 'agenda.statusCompleted', Cancelled: 'agenda.statusCancelled', NoShow: 'agenda.statusNoShow' }
const STATUS_SEVERITY = { Scheduled: 'info', Completed: 'success', Cancelled: 'secondary', NoShow: 'warn' }

function statusLabel(s) { return STATUS_LABEL_KEYS[s] ? t(STATUS_LABEL_KEYS[s]) : s }
function statusSeverity(s) { return STATUS_SEVERITY[s] ?? 'secondary' }
function statusClass(s) { return `status-${s.toLowerCase()}` }

async function load() {
  loading.value = true
  try {
    const from = weekStart.value.toISOString()
    const to = endOfWeek(weekStart.value, { weekStartsOn: 1 }).toISOString()
    const { data } = await api.get('/visits', { params: { from, to } })
    visits.value = data.data
  } catch {
    visits.value = []
  } finally {
    loading.value = false
  }
}

function goToSuggestions() {
  if (!detailVisit.value) return
  showDetail.value = false
  router.push(`/clients/${detailVisit.value.clientId}?tab=suggestions`)
}

function handleVisitClick(visit) {
  if (isAdmin) {
    detailVisit.value = visit
    showDetail.value = true
  } else {
    editVisit.value = visit
    showEdit.value = true
  }
}

async function changeStatus(visit, status) {
  try {
    await api.patch(`/visits/${visit.id}`, { status })
    await load()
  } catch {
    // ignore
  }
}

async function cancelVisit(visit) {
  try {
    await api.delete(`/visits/${visit.id}`)
    await load()
  } catch {
    // ignore
  }
}

onMounted(load)
</script>

<style scoped>
.page {
  padding: 32px;
  max-width: 1400px;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 24px;
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

/* ── Week navigation ─────────────────────────────────────────────────────── */
.week-nav {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
  background: var(--card);
  border-radius: 12px;
  border-top: 1px solid var(--card-top);
  border-left: 1px solid var(--card-left);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  padding: 12px 16px;
  box-shadow: var(--shadow-sm);
  flex-wrap: wrap;
}

.week-label {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  min-width: 220px;
  text-align: center;
}

.today-btn {
  margin-left: 8px;
}

.rep-legend {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-left: 16px;
}

.rep-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  border-radius: 20px;
  border: 1px solid;
  font-size: 12px;
  font-weight: 500;
  color: var(--text);
}

.rep-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* ── Week grid ───────────────────────────────────────────────────────────── */
.week-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
}

@media (max-width: 1100px) {
  .week-grid {
    grid-template-columns: repeat(5, 1fr);
  }
}

@media (max-width: 768px) {
  .week-grid {
    grid-template-columns: 1fr;
  }
}

.day-col {
  background: var(--card);
  border-radius: 12px;
  border-top: 1px solid var(--card-top);
  border-left: 1px solid var(--card-left);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  min-height: 200px;
  display: flex;
  flex-direction: column;
}

.day-col.today {
  box-shadow: 0 0 0 2px var(--accent), var(--shadow-sm);
}

.day-header {
  padding: 10px 12px 8px;
  border-bottom: 1px solid var(--divider);
  display: flex;
  align-items: center;
  gap: 8px;
}

.day-name {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-2);
}

.day-num {
  font-size: 18px;
  font-weight: 700;
  color: var(--text);
  line-height: 1;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.day-num.today {
  background: var(--accent);
  color: #0f1923;
}

.day-body {
  padding: 8px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.no-visits {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-3);
  font-size: 20px;
}

/* ── Visit cards ─────────────────────────────────────────────────────────── */
.visit-card {
  border-radius: 8px;
  padding: 8px 10px;
  cursor: pointer;
  border-left: 3px solid transparent;
  background: var(--row-hover);
  transition: box-shadow 0.15s, transform 0.1s;
}

.visit-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  transform: translateY(-1px);
}

.visit-card.status-scheduled {
  border-left-color: #60a5fa;
  background: rgba(96, 165, 250, 0.12);
}

.visit-card.status-completed {
  border-left-color: var(--accent);
  background: var(--accent-dim);
}

.visit-card.status-cancelled {
  border-left-color: rgba(156, 163, 175, 0.5);
  opacity: 0.65;
}

.visit-card.status-noshow {
  border-left-color: #f97316;
  background: rgba(249, 115, 22, 0.12);
}

.visit-time {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-2);
  margin-bottom: 2px;
}

.visit-rep {
  font-size: 10px;
  font-weight: 600;
  color: var(--text-3);
  text-transform: uppercase;
  letter-spacing: 0.3px;
  margin-bottom: 2px;
}

.visit-client {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.visit-purpose {
  font-size: 11px;
  color: var(--text-2);
  margin-bottom: 6px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.visit-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
}

.visit-dur {
  font-size: 10px;
  color: var(--text-3);
}

.visit-tag {
  font-size: 10px !important;
}

.visit-actions {
  display: flex;
  gap: 2px;
  margin-top: 4px;
  justify-content: flex-end;
}

.skeleton-card {
  height: 80px;
  background: linear-gradient(90deg, var(--row-hover) 25%, var(--divider) 50%, var(--row-hover) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 8px;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ── Admin detail dialog ─────────────────────────────────────────────────── */
.detail-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 4px 0;
}

.detail-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.detail-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-3);
  min-width: 110px;
  flex-shrink: 0;
}

.detail-value {
  font-size: 14px;
  color: var(--text);
}

.detail-purpose .detail-value {
  line-height: 1.6;
}

.purpose-text {
  white-space: pre-wrap;
}
</style>
