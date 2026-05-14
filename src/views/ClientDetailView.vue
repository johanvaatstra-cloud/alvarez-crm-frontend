<template>
  <div class="page" :class="isDark ? 'theme-dark' : 'theme-light'">

    <!-- ── Blob achtergronden ────────────────────────────────────────────────── -->
    <div class="blobs" aria-hidden="true">
      <div class="blob blob-1" />
      <div class="blob blob-2" />
      <div class="blob blob-3" />
      <div class="blob blob-4" />
    </div>

    <!-- ── Laden ─────────────────────────────────────────────────────────────── -->
    <div v-if="loading" class="page-loading">
      <i class="pi pi-spin pi-spinner" />
    </div>

    <!-- ── Fout ──────────────────────────────────────────────────────────────── -->
    <div v-else-if="error" class="page-error">
      <i class="pi pi-exclamation-triangle" />
      <p>{{ error }}</p>
      <button class="btn-ghost" @click="router.push('/clients')">
        <i class="pi pi-arrow-left" /> {{ t('common.back') }}
      </button>
    </div>

    <template v-else-if="client">

      <!-- ── Topbar ─────────────────────────────────────────────────────────── -->
      <header class="topbar">
        <button class="icon-btn" @click="router.push('/clients')">
          <i class="pi pi-arrow-left" />
        </button>

        <div class="topbar-title">
          <h1>{{ client.companyName }}</h1>
          <div class="topbar-badges">
            <span class="tbadge" :class="`tbadge-${(client.crmClientType || 'Other').toLowerCase()}`">
              {{ typeLabel(client.crmClientType) }}
            </span>
            <span class="tbadge" :class="client.isActive ? 'tbadge-active' : 'tbadge-inactive'">
              {{ client.isActive ? t('common.active') : t('common.inactive') }}
            </span>
          </div>
        </div>

        <div class="topbar-actions">
          <button class="hdr-btn" @click="showEditPanel = !showEditPanel">
            <i class="pi pi-pencil" />
            <span class="hdr-label">{{ t('clientCard.edit') }}</span>
          </button>
          <button class="hdr-btn hdr-btn-primary" @click="router.push(`/clients/${route.params.id}/order/new`)">
            <i class="pi pi-shopping-cart" />
            <span class="hdr-label">{{ t('clientDetail.newOrder') }}</span>
          </button>
          <button class="hdr-btn" @click="showVisitForm = true">
            <i class="pi pi-calendar-plus" />
            <span class="hdr-label">{{ t('clientDetail.planVisit') }}</span>
          </button>
          <button v-if="isAdmin" class="hdr-btn hdr-btn-menu" @click="router.push(`/clients/${route.params.id}/menu`)">
            <i class="ti ti-tools-kitchen-2" />
            <span class="hdr-label">{{ t('menu.title') }}</span>
          </button>
        </div>
      </header>

      <!-- ── Bewerk-paneel ─────────────────────────────────────────────────── -->
      <div v-if="showEditPanel" class="glass-card edit-panel">
        <div class="ep-hdr">
          <span class="card-title">{{ t('clientCard.editPanel') }}</span>
          <button class="icon-btn sm" @click="showEditPanel = false">
            <i class="pi pi-times" />
          </button>
        </div>
        <div class="ep-body">
          <div class="ep-field">
            <label class="ep-lbl">{{ t('clientDetail.clientType') }}</label>
            <Select
              v-model="form.clientType"
              :options="clientTypeOptions"
              option-label="label"
              option-value="value"
              :placeholder="t('clientDetail.selectType')"
              class="ep-sel"
            />
          </div>
          <button class="btn-save" :disabled="saving" @click="saveInfo">
            <i class="pi pi-save" /> {{ saving ? t('common.loading') : t('common.save') }}
          </button>

          <template v-if="isAdmin">
            <div class="ep-div" />
            <div class="ep-field">
              <label class="ep-lbl">{{ t('clientDetail.transferTo') }}</label>
              <Select
                v-model="form.salesRepId"
                :options="salesReps"
                option-label="fullName"
                option-value="id"
                :placeholder="t('clientDetail.chooseEmployee')"
                show-clear
                :loading="loadingSalesReps"
                class="ep-sel"
              />
            </div>
            <button
              class="btn-save"
              :disabled="assigning || form.salesRepId === (client.crmSalesRepId ?? null)"
              @click="assignSalesRep"
            >
              <i class="pi pi-arrow-right-arrow-left" />
              {{ assigning ? t('common.loading') : t('clientDetail.transfer') }}
            </button>

          </template>
        </div>
      </div>

      <!-- ── Statistieken ───────────────────────────────────────────────────── -->
      <div class="stats-row">
        <div class="glass-card stat-card">
          <span class="stat-lbl">{{ t('clientCard.statsRevenue') }}</span>
          <span class="stat-val">€ {{ formatStatAmount(monthlyRevenue) }}</span>
          <span class="stat-sub">{{ t('clientCard.thisMonth') }}</span>
        </div>
        <div class="glass-card stat-card">
          <span class="stat-lbl">{{ t('clientCard.statsOrders') }}</span>
          <span class="stat-val">{{ clientOrders.length }}</span>
          <span class="stat-sub">{{ t('clientCard.total') }}</span>
        </div>
        <div class="glass-card stat-card">
          <span class="stat-lbl">{{ t('clientCard.statsVisits') }}</span>
          <span class="stat-val">{{ visits.length }}</span>
          <span class="stat-sub">{{ t('clientCard.total') }}</span>
        </div>
        <div class="glass-card stat-card" :class="{ 'stat-owed': outstandingAmount > 0 }">
          <span class="stat-lbl">{{ t('clientCard.statsOutstanding') }}</span>
          <span class="stat-val" :class="{ 'val-danger': outstandingAmount > 0 }">
            € {{ formatStatAmount(outstandingAmount) }}
          </span>
          <span class="stat-sub">
            {{ outstandingAmount > 0 ? t('clientCard.openInvoices') : t('clientCard.allPaid') }}
          </span>
        </div>
      </div>

      <!-- ── Rij 1: Contactgegevens + Locatie ──────────────────────────────── -->
      <div class="grid-2">

        <!-- Contactgegevens -->
        <div class="glass-card">
          <div class="card-hdr">
            <span class="card-title">{{ t('clientCard.contactInfo') }}</span>
            <button v-if="!isAdmin" class="hdr-btn hdr-btn-record" @click="showReportForm = true">
              <i class="pi pi-microphone" /> {{ t('clientCard.startRecording') }}
            </button>
          </div>
          <div class="info-rows">
            <div class="info-row">
              <i class="pi pi-user info-ico" />
              <span class="info-lbl">{{ t('clientDetail.contactPerson') }}</span>
              <span class="info-val">{{ client.contactName || '—' }}</span>
            </div>
            <div class="info-row">
              <i class="pi pi-phone info-ico" />
              <span class="info-lbl">{{ t('common.phone') }}</span>
              <span class="info-val">{{ client.phone || '—' }}</span>
            </div>
            <div class="info-row">
              <i class="pi pi-envelope info-ico" />
              <span class="info-lbl">{{ t('common.email') }}</span>
              <span class="info-val">{{ client.email || '—' }}</span>
            </div>
            <div class="info-row">
              <i class="pi pi-hashtag info-ico" />
              <span class="info-lbl">{{ t('clientDetail.vatNumber') }}</span>
              <span class="info-val">{{ client.vatNumber || '—' }}</span>
            </div>
            <div class="info-row">
              <i class="pi pi-calendar info-ico" />
              <span class="info-lbl">{{ t('clientCard.nextVisit') }}</span>
              <span class="info-val" :class="{ 'val-accent': nextVisit }">
                {{ nextVisit
                    ? formatVisitDay(nextVisit.plannedDateTime) + ' ' + formatVisitTime(nextVisit.plannedDateTime)
                    : t('clientCard.noNextVisit') }}
              </span>
            </div>
            <div v-if="nextVisit" class="info-row info-row-action">
              <span class="info-ico" />
              <span class="info-lbl" />
              <button
                class="btn-link"
                @click="router.push(`/clients/${route.params.id}/order/new?visitId=${nextVisit.id}`)"
              >
                <i class="pi pi-shopping-cart" /> {{ t('clientDetail.enterOrder') }}
              </button>
            </div>
          </div>
        </div>

        <!-- Locatie -->
        <div class="glass-card">
          <div class="card-hdr">
            <span class="card-title">{{ t('clientCard.location') }}</span>
          </div>

          <!-- Embedded Google Maps iframe (wanneer API-key beschikbaar) -->
          <template v-if="googleMapsEmbedUrl">
            <iframe
              :src="googleMapsEmbedUrl"
              class="map-iframe"
              allowfullscreen
              loading="lazy"
              referrerpolicy="no-referrer-when-downgrade"
            />
            <div class="map-addr-footer">
              <span class="map-addr-text">
                {{ [client.addressStreet, client.addressPostalCode, client.city].filter(Boolean).join(', ') }}
              </span>
            </div>
          </template>

          <!-- Adres + knop (wanneer geen API-key) -->
          <div v-else class="map-ph">
            <div class="map-grid" />
            <div class="map-pin-wrap">
              <div class="map-pin-circle">
                <i class="pi pi-map-marker" />
              </div>
              <div v-if="client.addressStreet || client.city" class="map-addr">
                <p class="map-street">{{ client.addressStreet || '' }}</p>
                <p class="map-city">
                  {{ [client.addressPostalCode, client.city, client.addressCountry].filter(Boolean).join(' · ') }}
                </p>
                <button v-if="googleMapsUrl" class="map-open-btn" @click="openInMaps">
                  <i class="pi pi-map-marker" /> {{ t('clientCard.showOnMap') }}
                </button>
              </div>
              <p v-else class="map-empty">{{ t('clientCard.noAddress') }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Rij 2: Gespreksnotities + Gespreksthema's ──────────────────────── -->
      <div class="grid-2">

        <!-- Gespreksnotities -->
        <div class="glass-card">
          <div class="card-hdr">
            <span class="card-title">{{ t('clientCard.conversationNotes') }}</span>
          </div>
          <div class="notes-wrap">
            <Textarea
              v-model="form.notes"
              :placeholder="t('clientDetail.notesPlaceholder')"
              rows="7"
              class="notes-ta"
            />
          </div>
          <div class="card-ftr">
            <button class="btn-save" :disabled="saving" @click="saveInfo">
              <i class="pi pi-save" />
              {{ saving ? t('common.loading') : t('clientCard.saveNotes') }}
            </button>
          </div>
        </div>

        <!-- Gespreksthema's -->
        <div class="glass-card">
          <div class="card-hdr">
            <span class="card-title">{{ t('clientCard.topics') }}</span>
            <button
              v-if="isAdmin"
              class="btn-ghost-sm"
              :disabled="generatingSuggestions"
              @click="generateSuggestions"
            >
              <i :class="generatingSuggestions ? 'pi pi-spin pi-spinner' : 'pi pi-sparkles'" />
              {{ t('clientDetail.generateAdvice') }}
            </button>
          </div>

          <!-- Waarschuwingen -->
          <div v-if="lastOrderDaysAgo !== null && lastOrderDaysAgo > 21" class="alert-row alert-warn">
            <i class="pi pi-exclamation-triangle" />
            <span>{{ t('clientCard.orderWarning', { days: lastOrderDaysAgo }) }}</span>
          </div>
          <div v-if="menu && menu.dishes.length > 0" class="alert-row alert-tip">
            <i class="pi pi-lightbulb" />
            <span>{{ t('clientCard.menuTip') }}: {{ menu.dishes.slice(0, 3).join(', ') }}</span>
          </div>

          <!-- Suggesties — zichtbaar voor Admin én SalesRep -->
          <div v-if="suggestions.length === 0 && !generatingSuggestions" class="card-empty">
            <i class="pi pi-star" />
            <p>{{ isAdmin ? t('clientDetail.generateAdviceHint') : t('clientDetail.noAdviceYet') }}</p>
          </div>
          <div v-else class="topics-list">
            <div
              v-for="s in suggestions.slice(0, 6)"
              :key="s.id"
              class="topic-item"
              :class="{ 'topic-ok': s.wasAccepted === true, 'topic-no': s.wasAccepted === false }"
            >
              <div class="topic-top">
                <span class="topic-badge" :class="topicBadgeClass(s.suggestionType)">
                  {{ topicTypeLabel(s.suggestionType) }}
                </span>
                <span class="topic-name">{{ s.productName }}</span>
                <div class="topic-btns">
                  <button v-if="s.wasAccepted !== true" class="tbtn tbtn-ok" @click="updateSuggestion(s.id, true)">✓</button>
                  <button v-if="s.wasAccepted !== false" class="tbtn tbtn-no" @click="updateSuggestion(s.id, false)">✕</button>
                </div>
              </div>
              <p v-if="s.reason" class="topic-reason">{{ s.reason }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Rij 3: Activiteiten + Meest besteld ────────────────────────────── -->
      <div class="grid-2">

        <!-- Activiteiten tijdlijn -->
        <div class="glass-card">
          <div class="card-hdr">
            <span class="card-title">{{ t('clientCard.activities') }}</span>
          </div>
          <div v-if="timeline.length === 0" class="card-empty">
            <i class="pi pi-clock" />
            <p>{{ t('clientCard.noActivity') }}</p>
          </div>
          <div v-else class="timeline">
            <div v-for="(item, idx) in timeline" :key="idx" class="tl-item">
              <div class="tl-track">
                <div class="tl-dot" :style="{ background: item.color }" />
                <div v-if="idx < timeline.length - 1" class="tl-line" />
              </div>
              <div class="tl-body">
                <span class="tl-label">{{ item.label }}</span>
                <span class="tl-sub">{{ item.sub }}</span>
              </div>
              <span class="tl-date">{{ formatShortDate(item.date) }}</span>
            </div>
          </div>
        </div>

        <!-- Meest besteld -->
        <div class="glass-card">
          <div class="card-hdr">
            <span class="card-title">{{ t('clientCard.mostOrdered') }}</span>
          </div>
          <div v-if="mostOrdered.length === 0" class="card-empty">
            <i class="pi pi-box" />
            <p>{{ t('clientCard.noProducts') }}</p>
          </div>
          <div v-else class="ranked-list">
            <div v-for="(p, idx) in mostOrdered" :key="p.productId" class="ranked-row">
              <span class="rnk">{{ idx + 1 }}</span>
              <span class="rnk-sku">{{ p.sku || '—' }}</span>
              <span class="rnk-name">{{ p.name }}</span>
              <span class="rnk-unit">{{ p.unit }}</span>
              <span class="rnk-count">×{{ p.count }}</span>
              <span class="rnk-total">€ {{ p.total.toFixed(0) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Rij 4: Bestellingen + Omzetgrafiek ─────────────────────────────── -->
      <div class="grid-2">

        <!-- Laatste bestellingen -->
        <div class="glass-card">
          <div class="card-hdr">
            <span class="card-title">{{ t('clientCard.latestOrders') }}</span>
            <button class="hdr-btn-sm" @click="router.push(`/clients/${route.params.id}/order/new`)">
              <i class="pi pi-plus" /> {{ t('clientDetail.newOrder') }}
            </button>
          </div>
          <div v-if="loadingOrders" class="card-empty">
            <i class="pi pi-spin pi-spinner" />
          </div>
          <div v-else-if="clientOrders.length === 0" class="card-empty">
            <i class="pi pi-shopping-cart" />
            <p>{{ t('clientDetail.noOrders') }}</p>
          </div>
          <div v-else class="order-rows">
            <div
              v-for="o in clientOrders.slice(0, 6)"
              :key="o.id || o.localId"
              class="order-row"
              @click="router.push('/orders')"
            >
              <div class="or-date">{{ formatShortDate(o.orderDate || o.createdAt) }}</div>
              <div class="or-lines">{{ o.lines?.length ?? 0 }} prod.</div>
              <div class="or-amount">€ {{ formatOrderTotal(o) }}</div>
              <span class="status-pip" :class="`pip-${(o.status || 'draft').toLowerCase()}`">
                {{ orderStatusLabel(o.status) }}
              </span>
              <i class="pi pi-chevron-right or-chev" />
            </div>
          </div>
        </div>

        <!-- Omzetgrafiek (6 maanden) -->
        <div class="glass-card">
          <div class="card-hdr">
            <span class="card-title">{{ t('clientCard.revenueChart') }}</span>
          </div>
          <div class="chart-wrap">
            <div class="chart-bars">
              <div v-for="m in revenueByMonth" :key="m.key" class="chart-col">
                <span v-if="m.value > 0" class="chart-val">€{{ formatStatAmount(m.value) }}</span>
                <div
                  class="chart-bar"
                  :class="{ 'bar-active': m.isCurrentMonth }"
                  :style="{
                    height: maxRevenue > 0 ? ((m.value / maxRevenue) * 100) + '%' : '2px',
                    minHeight: m.value > 0 ? '8px' : '2px'
                  }"
                />
              </div>
            </div>
            <div class="chart-xlabels">
              <span
                v-for="m in revenueByMonth"
                :key="m.key"
                class="chart-xl"
                :class="{ 'xl-active': m.isCurrentMonth }"
              >{{ m.label }}</span>
            </div>
          </div>
        </div>
      </div>

    </template><!-- end v-else-if client -->

    <!-- ── Dialogen ───────────────────────────────────────────────────────────── -->
    <VisitFormDialog
      v-model="showVisitForm"
      :fixed-client-id="route.params.id"
      @saved="loadVisits"
    />
    <ReportFormDialog
      v-model="showReportForm"
      :fixed-client-id="route.params.id"
      @saved="loadReports"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { useI18n } from 'vue-i18n'
import { format, parseISO } from 'date-fns'
import { nl, enGB, es, ca } from 'date-fns/locale'
import api from '../api/axios'
import Select from 'primevue/select'
import Textarea from 'primevue/textarea'
import Button from 'primevue/button'
import VisitFormDialog from '../components/VisitFormDialog.vue'
import ReportFormDialog from '../components/ReportFormDialog.vue'
import { useAuthStore } from '../stores/auth'
import { cacheClients } from '../services/offlineClientCache.js'
import { useTheme } from '../composables/useTheme.js'

const { t, locale } = useI18n()
const route  = useRoute()
const router = useRouter()
const toast  = useToast()
const authStore = useAuthStore()
const isAdmin = authStore.isAdmin   // ComputedRef<boolean> — auto-unwrapped in templates

const DFNS_LOCALES = { nl, en: enGB, es, ca }
const dateFnsLocale = computed(() => DFNS_LOCALES[locale.value] ?? nl)

// ── Thema ─────────────────────────────────────────────────────────────────────
const { isDark } = useTheme()

// ── State ─────────────────────────────────────────────────────────────────────
const client  = ref(null)
const loading = ref(true)
const saving  = ref(false)
const error   = ref('')
const showEditPanel = ref(false)

// ── Bezoeken ──────────────────────────────────────────────────────────────────
const visits       = ref([])
const loadingVisits = ref(false)
const showVisitForm = ref(false)

const STATUS_LABELS   = { Scheduled: 'agenda.statusPlanned', Completed: 'agenda.statusCompleted', Cancelled: 'agenda.statusCancelled', NoShow: 'agenda.statusNoShow' }
const STATUS_SEVERITY = { Scheduled: 'info', Completed: 'success', Cancelled: 'secondary', NoShow: 'warn' }
function statusLabel(s)   { return STATUS_LABELS[s] ? t(STATUS_LABELS[s]) : s }
function statusSeverity(s){ return STATUS_SEVERITY[s] ?? 'secondary' }
function formatVisitDay(dt) { return format(parseISO(dt), 'd MMM yyyy', { locale: dateFnsLocale.value }) }
function formatVisitTime(dt){ return format(parseISO(dt), 'HH:mm') }

async function loadVisits() {
  loadingVisits.value = true
  try {
    const { data } = await api.get('/visits', { params: { clientId: route.params.id } })
    visits.value = data.data
  } catch {
    visits.value = []
  } finally {
    loadingVisits.value = false
  }
}

// ── Bestellingen ──────────────────────────────────────────────────────────────
const clientOrders  = ref([])
const loadingOrders = ref(false)

async function loadClientOrders() {
  loadingOrders.value = true
  try {
    const { data } = await api.get('/orders', { params: { clientId: route.params.id, pageSize: 50 } })
    clientOrders.value = data.data || []
  } catch {
    clientOrders.value = []
  } finally {
    loadingOrders.value = false
  }
}

function orderStatusLabel(s) {
  const map = { Draft: t('orders.statusDraft'), draft: t('orders.statusDraft'), Confirmed: t('orders.statusConfirmed'), confirmed: t('orders.statusConfirmed'), SentToErp: t('orders.statusSentToErp'), ProcessedByErp: t('orders.statusProcessed'), synced: t('orders.statusSynced') }
  return map[s] || s
}
function formatOrderTotal(o) {
  const v = o.totalAmount ?? (o.lines?.reduce((s, l) => s + l.quantity * l.unitPrice * (1 - (l.discount || 0) / 100), 0) ?? 0)
  return v.toFixed(2).replace('.', ',')
}

// ── Rapporten ─────────────────────────────────────────────────────────────────
const reports      = ref([])
const loadingReports = ref(false)
const showReportForm = ref(false)

const REPORT_STATUS_SEVERITY = { Uploaded: 'secondary', Transcribing: 'info', Summarized: 'success', Error: 'danger' }
function reportStatusLabel(s) {
  const keys = { Uploaded: 'reportStatus.uploaded', Transcribing: 'reportStatus.transcribingShort', Summarized: 'reportStatus.summarized', Error: 'reportStatus.error' }
  return keys[s] ? t(keys[s]) : s
}
function reportStatusSeverity(s) { return REPORT_STATUS_SEVERITY[s] ?? 'secondary' }

async function loadReports() {
  loadingReports.value = true
  try {
    const { data } = await api.get('/reports', { params: { clientId: route.params.id } })
    reports.value = data.data
  } catch {
    reports.value = []
  } finally {
    loadingReports.value = false
  }
}

// ── Formulier ─────────────────────────────────────────────────────────────────
const form = reactive({ notes: '', clientType: 'Restaurant', salesRepId: null })

const clientTypeOptions = computed(() => [
  { label: t('clients.typeRestaurant'), value: 'Restaurant' },
  { label: t('clients.typeHotel'),      value: 'Hotel'      },
  { label: t('clients.typeCatering'),   value: 'Catering'   },
  { label: t('clients.typeOther'),      value: 'Other'      }
])

const TYPE_LABELS   = { Restaurant: 'clients.typeRestaurant', Hotel: 'clients.typeHotel', Catering: 'clients.typeCatering', Other: 'clients.typeOther' }
const TYPE_SEVERITY = { Restaurant: 'info', Hotel: 'warn', Catering: 'success', Other: 'secondary' }
function typeLabel(type)   { return TYPE_LABELS[type] ? t(TYPE_LABELS[type]) : type }
function typeSeverity(type){ return TYPE_SEVERITY[type] ?? 'secondary' }

// ── Laden ─────────────────────────────────────────────────────────────────────
async function load() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.get(`/clients/${route.params.id}`)
    client.value     = data.data
    form.notes       = data.data.crmNotes ?? ''
    form.clientType  = data.data.crmClientType ?? 'Restaurant'
    form.salesRepId  = data.data.crmSalesRepId ?? null
    cacheClients([data.data])
  } catch (e) {
    error.value = e.response?.status === 404
      ? t('clientDetail.notFound')
      : t('clientDetail.loadError')
  } finally {
    loading.value = false
  }
}

async function saveInfo() {
  saving.value = true
  try {
    await api.patch(`/clients/${route.params.id}`, { notes: form.notes, clientType: form.clientType })
    client.value.crmNotes      = form.notes
    client.value.crmClientType = form.clientType
    toast.add({ severity: 'success', summary: t('clientDetail.savedSuccess'), life: 2000 })
  } catch {
    toast.add({ severity: 'error', summary: t('clientDetail.saveFailed'), life: 3000 })
  } finally {
    saving.value = false
  }
}

// ── Medewerker toewijzen (admin) ──────────────────────────────────────────────
const salesReps       = ref([])
const loadingSalesReps = ref(false)
const assigning        = ref(false)

async function loadSalesReps() {
  if (!isAdmin.value) return
  loadingSalesReps.value = true
  try {
    const { data } = await api.get('/admin/users')
    salesReps.value = data.data
  } catch {
    salesReps.value = []
  } finally {
    loadingSalesReps.value = false
  }
}

async function assignSalesRep() {
  assigning.value = true
  try {
    await api.patch(`/clients/${route.params.id}/assign`, { salesRepId: form.salesRepId ?? null })
    const rep = salesReps.value.find(r => r.id === form.salesRepId)
    client.value.crmSalesRepId = form.salesRepId ?? null
    client.value.salesRepName  = rep?.fullName ?? null
    toast.add({ severity: 'success', summary: rep ? `${t('clientDetail.transferredTo')} ${rep.fullName}` : t('clientDetail.employeeDetached'), life: 3000 })
  } catch {
    toast.add({ severity: 'error', summary: t('clientDetail.transferFailed'), life: 3000 })
  } finally {
    assigning.value = false
  }
}

// ── Menu & suggesties ─────────────────────────────────────────────────────────
const menu                  = ref(null)
const suggestions           = ref([])
const generatingSuggestions = ref(false)

async function loadSuggestions() {
  try {
    const { data } = await api.get(`/clients/${route.params.id}/suggestions`)
    suggestions.value = data.data
  } catch { suggestions.value = [] }
}

async function generateSuggestions() {
  generatingSuggestions.value = true
  try {
    const { data } = await api.post(`/clients/${route.params.id}/suggestions/generate`, {})
    suggestions.value = data.data
    toast.add({ severity: 'success', summary: t('clientDetail.adviceGenerated'), detail: `${data.data.length} ${t('clientDetail.adviceItems')}`, life: 4000 })
  } catch (e) {
    toast.add({ severity: 'error', summary: t('clientDetail.generateFailed'), detail: e.response?.data?.error ?? '', life: 4000 })
  } finally {
    generatingSuggestions.value = false
  }
}

async function updateSuggestion(id, wasAccepted) {
  try {
    const { data } = await api.patch(`/clients/${route.params.id}/suggestions/${id}`, { wasAccepted })
    const idx = suggestions.value.findIndex(s => s.id === id)
    if (idx !== -1) suggestions.value[idx] = data.data
  } catch {
    toast.add({ severity: 'error', summary: t('clientDetail.updateFailed'), life: 3000 })
  }
}

async function loadMenu() {
  try {
    const { data } = await api.get(`/clients/${route.params.id}/menu`)
    menu.value = data.data
  } catch { menu.value = null }
}

// ── Hulpfuncties ──────────────────────────────────────────────────────────────
function formatStatAmount(v) {
  const n = Number(v) || 0
  if (n >= 10000) return (n / 1000).toFixed(1).replace('.', ',') + 'k'
  if (n >= 1000)  return (n / 1000).toFixed(2).replace('.', ',') + 'k'
  return n.toFixed(0)
}

function formatShortDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit' })
}

function topicBadgeClass(type) {
  return { Ai: 'badge-ai', Promotion: 'badge-promo', NewProduct: 'badge-new' }[type] ?? 'badge-ai'
}
function topicTypeLabel(type) {
  return { Ai: t('clientCard.aiSuggestion'), Promotion: t('clientDetail.promotion'), NewProduct: t('clientDetail.new') }[type] ?? type
}

// ── Berekende waarden ─────────────────────────────────────────────────────────

const nextVisit = computed(() => {
  const now = new Date()
  return visits.value
    .filter(v => v.status === 'Scheduled' && new Date(v.plannedDateTime) >= now)
    .sort((a, b) => new Date(a.plannedDateTime) - new Date(b.plannedDateTime))[0] ?? null
})

const monthlyRevenue = computed(() => {
  const now = new Date()
  return clientOrders.value
    .filter(o => {
      const d = new Date(o.orderDate || o.createdAt)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    .reduce((sum, o) => sum + (o.totalAmount ?? (o.lines?.reduce((s, l) => s + l.quantity * l.unitPrice * (1 - (l.discount || 0) / 100), 0) ?? 0)), 0)
})

const outstandingAmount = computed(() =>
  clientOrders.value
    .filter(o => o.status !== 'ProcessedByErp' && o.status !== 'synced')
    .reduce((sum, o) => sum + (o.totalAmount ?? (o.lines?.reduce((s, l) => s + l.quantity * l.unitPrice * (1 - (l.discount || 0) / 100), 0) ?? 0)), 0)
)

const lastOrderDaysAgo = computed(() => {
  if (!clientOrders.value.length) return null
  const latest = clientOrders.value.reduce((latest, o) => {
    const d = new Date(o.orderDate || o.createdAt)
    return d > latest ? d : latest
  }, new Date(0))
  return Math.floor((Date.now() - latest.getTime()) / 86400000)
})

const timeline = computed(() => {
  const items = []
  for (const v of visits.value) {
    const visitLabel = v.purpose
      ? `${t('clientCard.visitLabel')} — ${v.purpose}`
      : t('clientCard.visitLabel')
    items.push({ date: v.plannedDateTime, label: visitLabel, sub: statusLabel(v.status), color: v.status === 'Completed' ? '#4ade80' : v.status === 'Scheduled' ? '#60a5fa' : '#9ca3af' })
  }
  for (const o of clientOrders.value) {
    items.push({ date: o.orderDate || o.createdAt, label: `€ ${formatOrderTotal(o)}`, sub: orderStatusLabel(o.status), color: '#f59e0b' })
  }
  for (const r of reports.value) {
    items.push({ date: r.visitDate, label: t('clientCard.reportLabel'), sub: reportStatusLabel(r.status), color: '#a78bfa' })
  }
  return items.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8)
})

const mostOrdered = computed(() => {
  const map = {}
  for (const order of clientOrders.value) {
    for (const line of (order.lines || [])) {
      const key = line.productId || line.productNameRaw
      if (!key) continue
      if (!map[key]) map[key] = { productId: key, name: line.productNameRaw || line.productName || '', sku: line.productSku || '', unit: line.unit || '', count: 0, total: 0 }
      map[key].count++
      map[key].total += line.lineTotal ?? (line.quantity * line.unitPrice * (1 - (line.discount || 0) / 100))
    }
  }
  return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 5)
})

const revenueByMonth = computed(() => {
  const totals = {}
  for (const o of clientOrders.value) {
    const d   = new Date(o.orderDate || o.createdAt)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    totals[key] = (totals[key] || 0) + (o.totalAmount ?? (o.lines?.reduce((s, l) => s + l.quantity * l.unitPrice * (1 - (l.discount || 0) / 100), 0) ?? 0))
  }
  const now = new Date()
  return Array.from({ length: 6 }, (_, i) => {
    const d   = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    return { key, label: d.toLocaleDateString('nl-NL', { month: 'short' }), value: totals[key] || 0, isCurrentMonth: d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() }
  })
})

const maxRevenue = computed(() => Math.max(...revenueByMonth.value.map(m => m.value), 1))

const _mapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY ?? ''

const googleMapsQuery = computed(() => {
  if (!client.value) return ''
  const parts = [client.value.addressStreet, client.value.addressPostalCode, client.value.city, client.value.addressCountry].filter(Boolean)
  return parts.length ? encodeURIComponent(parts.join(' ')) : ''
})

const googleMapsUrl = computed(() =>
  googleMapsQuery.value
    ? `https://www.google.com/maps/search/?api=1&query=${googleMapsQuery.value}`
    : ''
)

const googleMapsEmbedUrl = computed(() =>
  _mapsApiKey && googleMapsQuery.value
    ? `https://www.google.com/maps/embed/v1/place?key=${_mapsApiKey}&q=${googleMapsQuery.value}`
    : ''
)

function openInMaps() {
  if (googleMapsUrl.value) window.location.href = googleMapsUrl.value
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────
onMounted(() => {
  load()
  loadVisits()
  loadReports()
  loadClientOrders()
  loadMenu()
  loadSuggestions()
  loadSalesReps()
})
</script>

<style scoped>
/* ── Basis & variabelen ───────────────────────────────────────────────────── */
.page {
  min-height: 100vh;
  padding: 24px 28px 48px;
  max-width: 1300px;
  margin: 0 auto;
  position: relative;
  font-size: 14px;
}

/* Donker thema */
.theme-dark {
  --bg:          #0f1923;
  --card:        rgba(255,255,255,0.07);
  --card-top:    rgba(255,255,255,0.22);
  --card-left:   rgba(255,255,255,0.10);
  --border:      rgba(255,255,255,0.06);
  --text:        rgba(255,255,255,0.92);
  --muted:       rgba(255,255,255,0.45);
  --dim:         rgba(255,255,255,0.22);
  --accent:      #4ade80;
  --accent-dim:  rgba(74,222,128,0.15);
  --divider:     rgba(255,255,255,0.07);
  --btn:         rgba(255,255,255,0.10);
  --btn-hover:   rgba(255,255,255,0.17);
  --btn-border:  rgba(255,255,255,0.14);
  --shadow:      0 8px 32px rgba(0,0,0,0.45);
  --inp:         rgba(255,255,255,0.08);
  --inp-border:  rgba(255,255,255,0.14);
  --danger:      #f87171;
  background:    #0f1923;
  color:         rgba(255,255,255,0.92);
}

/* Licht thema */
.theme-light {
  --bg:          transparent;
  --card:        rgba(255,255,255,0.68);
  --card-top:    rgba(255,255,255,0.97);
  --card-left:   rgba(255,255,255,0.85);
  --border:      rgba(0,0,0,0.05);
  --text:        #1a2e1a;
  --muted:       #6c757d;
  --dim:         #adb5bd;
  --accent:      #2d6a4f;
  --accent-dim:  rgba(45,106,79,0.10);
  --divider:     rgba(0,0,0,0.06);
  --btn:         rgba(45,106,79,0.08);
  --btn-hover:   rgba(45,106,79,0.14);
  --btn-border:  rgba(45,106,79,0.18);
  --shadow:      0 2px 16px rgba(0,0,0,0.07);
  --inp:         rgba(255,255,255,0.9);
  --inp-border:  rgba(0,0,0,0.12);
  --danger:      #dc3545;
  background:    linear-gradient(135deg, #e8f5ee 0%, #f0f4ff 100%);
  background-attachment: fixed;
  color:         #1a2e1a;
}

/* ── Blob achtergronden ───────────────────────────────────────────────────── */
.blobs {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}
.blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(72px);
  opacity: 0;
  transition: opacity .4s;
}
.theme-dark .blob { opacity: 1; }

.blob-1 { width: 600px; height: 600px; top: -120px; right: -80px;  background: radial-gradient(circle, rgba(74,222,128,0.28) 0%, transparent 68%); }
.blob-2 { width: 520px; height: 520px; bottom: 10%;  left: -120px; background: radial-gradient(circle, rgba(96,165,250,0.22) 0%, transparent 68%); }
.blob-3 { width: 420px; height: 420px; top: 42%;     right: 28%;   background: radial-gradient(circle, rgba(167,139,250,0.20) 0%, transparent 68%); }
.blob-4 { width: 360px; height: 360px; bottom: 8%;   right: 8%;    background: radial-gradient(circle, rgba(34,211,238,0.16) 0%, transparent 68%); }

/* ── Content boven blobs ─────────────────────────────────────────────────── */
.page > *:not(.blobs) { position: relative; z-index: 1; }

/* ── Laad / fout states ─────────────────────────────────────────────────── */
.page-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 40vh;
  font-size: 28px;
  color: var(--muted);
}
.page-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  height: 40vh;
  color: var(--muted);
}
.page-error i { font-size: 40px; color: var(--danger); }
.page-error p { margin: 0; font-size: 15px; }

/* ── Topbar ──────────────────────────────────────────────────────────────── */
.topbar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}
.topbar-title { flex: 1; min-width: 0; }
.topbar-title h1 {
  margin: 0 0 6px;
  font-size: 22px;
  font-weight: 700;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.topbar-badges { display: flex; gap: 6px; flex-wrap: wrap; }
.topbar-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

/* ── Type badges ─────────────────────────────────────────────────────────── */
.tbadge {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 20px;
  border: 1px solid transparent;
}
.tbadge-restaurant { background: rgba(96,165,250,0.18);  color: #60a5fa; border-color: rgba(96,165,250,0.3); }
.tbadge-hotel      { background: rgba(251,191,36,0.18);  color: #fbbf24; border-color: rgba(251,191,36,0.3); }
.tbadge-catering   { background: rgba(74,222,128,0.18);  color: var(--accent); border-color: rgba(74,222,128,0.3); }
.tbadge-other      { background: rgba(156,163,175,0.18); color: #9ca3af; border-color: rgba(156,163,175,0.3); }
.tbadge-active     { background: rgba(74,222,128,0.18);  color: var(--accent); border-color: rgba(74,222,128,0.3); }
.tbadge-inactive   { background: rgba(156,163,175,0.15); color: var(--muted);  border-color: rgba(156,163,175,0.25); }

/* ── Knopen in header ────────────────────────────────────────────────────── */
.icon-btn {
  width: 36px; height: 36px;
  border: 1px solid var(--btn-border);
  background: var(--btn);
  color: var(--text);
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; font-size: 14px;
  transition: background .15s;
  flex-shrink: 0;
}
.icon-btn:hover  { background: var(--btn-hover); }
.icon-btn.sm     { width: 28px; height: 28px; font-size: 12px; }
.theme-btn       { }

.hdr-btn {
  display: flex; align-items: center; gap: 6px;
  padding: 7px 14px;
  border: 1px solid var(--btn-border);
  background: var(--btn);
  color: var(--text);
  border-radius: 8px;
  cursor: pointer; font-size: 13px;
  transition: background .15s;
  white-space: nowrap;
}
.hdr-btn:hover         { background: var(--btn-hover); }
.hdr-btn-primary       { background: var(--accent-dim); border-color: var(--accent); color: var(--accent); }
.hdr-btn-primary:hover { background: rgba(74,222,128,0.22); }
.hdr-btn-record        { background: rgba(167,139,250,0.15); border-color: rgba(167,139,250,0.35); color: #a78bfa; }
.hdr-btn-record:hover  { background: rgba(167,139,250,0.25); }
.hdr-btn-menu          { background: rgba(34,211,238,0.12); border-color: rgba(34,211,238,0.30); color: #22d3ee; }
.hdr-btn-menu:hover    { background: rgba(34,211,238,0.20); }

.hdr-label { font-size: 13px; }
@media (max-width: 900px) { .hdr-label { display: none; } }

.hdr-btn-sm {
  display: flex; align-items: center; gap: 5px;
  padding: 5px 11px;
  border: 1px solid var(--btn-border);
  background: var(--btn);
  color: var(--accent);
  border-radius: 7px;
  cursor: pointer; font-size: 12px;
  transition: background .15s;
}
.hdr-btn-sm:hover { background: var(--btn-hover); }

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
}

/* ── Kaart header / footer ───────────────────────────────────────────────── */
.card-hdr {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 18px 10px;
  border-bottom: 1px solid var(--divider);
  gap: 8px;
}
.card-title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .7px;
  text-transform: uppercase;
  color: var(--muted);
}
.card-ftr {
  padding: 10px 18px 14px;
  border-top: 1px solid var(--divider);
}
.card-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 10px; padding: 40px 20px;
  color: var(--dim);
  text-align: center;
}
.card-empty i  { font-size: 28px; }
.card-empty p  { margin: 0; font-size: 13px; }

/* ── Bewerk-paneel ───────────────────────────────────────────────────────── */
.edit-panel { margin-bottom: 16px; }
.ep-hdr {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 18px 10px;
  border-bottom: 1px solid var(--divider);
}
.ep-body { padding: 16px 18px; display: flex; flex-direction: column; gap: 12px; }
.ep-field { display: flex; flex-direction: column; gap: 6px; }
.ep-lbl   { font-size: 12px; font-weight: 600; color: var(--muted); }
.ep-sel   { width: 220px; }
.ep-div   { height: 1px; background: var(--divider); margin: 4px 0; }
.ep-scrape-row { display: flex; gap: 8px; flex-wrap: wrap; }
.ep-url       { flex: 1; min-width: 200px; }
.ep-upload-row { display: flex; align-items: center; gap: 8px; }
.ep-upload-lbl { font-size: 12px; color: var(--muted); }
.ep-dishes     { display: flex; flex-direction: column; gap: 6px; }

/* ── Statistieken rij ────────────────────────────────────────────────────── */
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}
@media (max-width: 900px) { .stats-row { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 500px) { .stats-row { grid-template-columns: 1fr 1fr; } }

.stat-card {
  padding: 18px 20px;
  display: flex; flex-direction: column; gap: 4px;
}
.stat-lbl  { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .6px; color: var(--muted); }
.stat-val  { font-size: 26px; font-weight: 800; color: var(--text); line-height: 1.1; }
.stat-sub  { font-size: 11px; color: var(--dim); }
.stat-owed { border-top-color: rgba(248,113,113,0.5) !important; }
.val-danger { color: var(--danger) !important; }
.val-accent { color: var(--accent); }

/* ── 2-koloms raster ─────────────────────────────────────────────────────── */
.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}
@media (max-width: 768px) { .grid-2 { grid-template-columns: 1fr; } }

/* ── Contactgegevens ────────────────────────────────────────────────────────── */
.info-rows { padding: 4px 0; }
.info-row {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 18px;
  border-bottom: 1px solid var(--divider);
}
.info-row:last-child { border-bottom: none; }
.info-ico  { font-size: 14px; color: var(--muted); width: 16px; flex-shrink: 0; }
.info-lbl  { font-size: 12px; color: var(--muted); width: 120px; flex-shrink: 0; }
.info-val  { font-size: 13px; color: var(--text); flex: 1; }
.info-row-action { padding-top: 4px; padding-bottom: 8px; }

/* ── Locatiekaart ────────────────────────────────────────────────────────── */
.map-iframe {
  width: 100%; height: 220px;
  border: none; display: block;
}
.map-addr-footer {
  padding: 8px 18px;
  border-top: 1px solid var(--divider);
}
.map-addr-text { font-size: 12px; color: var(--muted); }

.map-open-btn {
  display: inline-flex; align-items: center; gap: 6px;
  margin-top: 12px;
  padding: 8px 16px;
  background: var(--accent-dim);
  border: 1px solid var(--accent);
  color: var(--accent);
  border-radius: 8px; cursor: pointer;
  font-size: 12px; font-weight: 600;
  transition: background .15s;
}
.map-open-btn:hover { background: rgba(74,222,128,0.22); }
.theme-light .map-open-btn:hover { background: rgba(45,106,79,0.18); }

.map-ph {
  position: relative;
  height: 200px;
  overflow: hidden;
  display: flex; align-items: center; justify-content: center;
  background: var(--inp);
}
.map-grid {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(var(--divider) 1px, transparent 1px),
    linear-gradient(90deg, var(--divider) 1px, transparent 1px);
  background-size: 32px 32px;
}
.map-pin-wrap {
  position: relative; z-index: 1;
  display: flex; flex-direction: column; align-items: center; gap: 8px;
}
.map-pin-circle {
  width: 48px; height: 48px;
  background: var(--accent-dim);
  border: 2px solid var(--accent);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 20px;
  color: var(--accent);
}
.map-addr   { text-align: center; }
.map-street { margin: 0; font-size: 13px; font-weight: 600; color: var(--text); }
.map-city   { margin: 2px 0 0; font-size: 12px; color: var(--muted); }
.map-empty  { font-size: 12px; color: var(--dim); margin: 0; }

/* ── Notities ────────────────────────────────────────────────────────────── */
.notes-wrap { padding: 14px 18px 0; }
.notes-ta {
  width: 100%; box-sizing: border-box;
  background: var(--inp) !important;
  border-color: var(--inp-border) !important;
  color: var(--text) !important;
  font-size: 13px;
  resize: vertical;
}
:deep(.notes-ta .p-textarea) {
  background: var(--inp);
  color: var(--text);
  border-color: var(--inp-border);
}

/* ── Gespreksthema's ─────────────────────────────────────────────────────── */
.alert-row {
  display: flex; align-items: flex-start; gap: 8px;
  padding: 10px 18px;
  font-size: 12px;
  border-bottom: 1px solid var(--divider);
}
.alert-warn { color: #fbbf24; background: rgba(251,191,36,0.08); }
.alert-tip  { color: #22d3ee; background: rgba(34,211,238,0.08); }
.alert-row i { margin-top: 1px; flex-shrink: 0; }

.topics-list { padding: 4px 0; }
.topic-item {
  padding: 10px 18px;
  border-bottom: 1px solid var(--divider);
  transition: background .12s;
}
.topic-item:last-child { border-bottom: none; }
.topic-item:hover { background: rgba(255,255,255,0.04); }
.topic-ok { opacity: .65; }
.topic-no { opacity: .35; }

.topic-top { display: flex; align-items: center; gap: 8px; }
.topic-badge {
  font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px;
  padding: 2px 7px; border-radius: 10px; flex-shrink: 0;
}
.badge-ai    { background: rgba(74,222,128,0.18);  color: var(--accent); }
.badge-promo { background: rgba(251,191,36,0.18);  color: #fbbf24; }
.badge-new   { background: rgba(167,139,250,0.18); color: #a78bfa; }

.topic-name   { font-size: 13px; color: var(--text); flex: 1; }
.topic-btns   { display: flex; gap: 4px; }
.tbtn {
  width: 24px; height: 24px; border-radius: 50%;
  border: 1px solid var(--btn-border); background: var(--btn);
  cursor: pointer; font-size: 11px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  transition: background .12s;
}
.tbtn-ok { color: #4ade80; } .tbtn-ok:hover { background: rgba(74,222,128,0.2); }
.tbtn-no { color: #f87171; } .tbtn-no:hover { background: rgba(248,113,113,0.2); }

.topic-reason { margin: 4px 0 0; font-size: 11px; color: var(--muted); line-height: 1.5; }

/* ── Tijdlijn ────────────────────────────────────────────────────────────── */
.timeline { padding: 8px 0; }
.tl-item {
  display: flex; align-items: flex-start; gap: 12px;
  padding: 0 18px 0 14px;
  min-height: 44px;
}
.tl-track {
  display: flex; flex-direction: column; align-items: center;
  padding-top: 6px; flex-shrink: 0;
}
.tl-dot  { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.tl-line { width: 2px; flex: 1; min-height: 24px; background: var(--divider); margin-top: 3px; }
.tl-body { flex: 1; min-width: 0; padding-top: 4px; }
.tl-label { display: block; font-size: 13px; color: var(--text); font-weight: 500; }
.tl-sub   { display: block; font-size: 11px; color: var(--muted); margin-top: 1px; }
.tl-date  { font-size: 11px; color: var(--dim); white-space: nowrap; padding-top: 5px; flex-shrink: 0; }

/* ── Meest besteld ───────────────────────────────────────────────────────── */
.ranked-list { padding: 4px 0; }
.ranked-row {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 18px;
  border-bottom: 1px solid var(--divider);
  font-size: 13px;
}
.ranked-row:last-child { border-bottom: none; }
.rnk       { font-size: 11px; font-weight: 700; color: var(--muted); width: 18px; flex-shrink: 0; }
.rnk-sku   { font-size: 10px; color: var(--muted); font-family: monospace; width: 60px; flex-shrink: 0; overflow: hidden; text-overflow: ellipsis; }
.rnk-name  { flex: 1; color: var(--text); font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rnk-unit  { font-size: 11px; color: var(--dim); width: 36px; flex-shrink: 0; }
.rnk-count { font-size: 12px; color: var(--muted); width: 38px; flex-shrink: 0; text-align: right; }
.rnk-total { font-size: 12px; font-weight: 600; color: var(--accent); width: 50px; flex-shrink: 0; text-align: right; }

/* ── Bestellingen lijst ──────────────────────────────────────────────────── */
.order-rows { padding: 4px 0; }
.order-row {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 18px;
  border-bottom: 1px solid var(--divider);
  cursor: pointer;
  transition: background .12s;
}
.order-row:last-child { border-bottom: none; }
.order-row:hover      { background: rgba(255,255,255,0.04); }
.or-date    { font-size: 12px; color: var(--muted); width: 50px; flex-shrink: 0; }
.or-lines   { font-size: 12px; color: var(--dim); width: 55px; }
.or-amount  { font-size: 13px; font-weight: 600; color: var(--text); flex: 1; }
.or-chev    { font-size: 11px; color: var(--dim); flex-shrink: 0; }

.status-pip {
  font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .4px;
  padding: 2px 8px; border-radius: 10px;
  flex-shrink: 0;
}
.pip-draft,    .pip-concept   { background: rgba(156,163,175,0.18); color: #9ca3af; }
.pip-confirmed, .pip-bevestigd { background: rgba(96,165,250,0.18);  color: #60a5fa; }
.pip-senttoerp                 { background: rgba(251,191,36,0.18);  color: #fbbf24; }
.pip-processedbyerp            { background: rgba(74,222,128,0.18);  color: #4ade80; }
.pip-synced                    { background: rgba(96,165,250,0.15);  color: #60a5fa; }

/* ── Omzetgrafiek ────────────────────────────────────────────────────────── */
.chart-wrap { padding: 16px 18px 12px; display: flex; flex-direction: column; gap: 8px; height: 180px; }
.chart-bars {
  flex: 1; display: flex; align-items: flex-end; gap: 6px; min-height: 0;
}
.chart-col {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px;
  justify-content: flex-end;
}
.chart-val {
  font-size: 9px; color: var(--muted); white-space: nowrap;
  writing-mode: horizontal-tb;
}
.chart-bar {
  width: 100%; border-radius: 4px 4px 0 0;
  background: rgba(74,222,128,0.30);
  transition: height .4s ease;
}
.bar-active { background: var(--accent); }
.theme-light .chart-bar        { background: rgba(45,106,79,0.22); }
.theme-light .chart-bar.bar-active { background: #2d6a4f; }

.chart-xlabels { display: flex; gap: 6px; }
.chart-xl {
  flex: 1; text-align: center;
  font-size: 11px; color: var(--dim);
}
.xl-active { color: var(--accent); font-weight: 700; }

/* ── Gedeelde hulpstijlen ────────────────────────────────────────────────── */
.btn-save {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 16px;
  background: var(--accent-dim);
  border: 1px solid var(--accent);
  color: var(--accent);
  border-radius: 8px;
  cursor: pointer; font-size: 13px; font-weight: 600;
  transition: background .15s;
}
.btn-save:hover:not(:disabled)   { background: rgba(74,222,128,0.22); }
.btn-save:disabled { opacity: .4; cursor: not-allowed; }

.btn-ghost {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 16px;
  background: var(--btn);
  border: 1px solid var(--btn-border);
  color: var(--text);
  border-radius: 8px;
  cursor: pointer; font-size: 13px;
  transition: background .15s;
}
.btn-ghost:hover { background: var(--btn-hover); }

.btn-ghost-sm {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 5px 11px;
  background: var(--btn); border: 1px solid var(--btn-border);
  color: var(--muted);
  border-radius: 7px; cursor: pointer; font-size: 12px;
  transition: background .15s;
}
.btn-ghost-sm:hover:not(:disabled) { background: var(--btn-hover); }
.btn-ghost-sm:disabled             { opacity: .4; cursor: not-allowed; }

.btn-link {
  display: inline-flex; align-items: center; gap: 5px;
  background: none; border: none; padding: 0;
  color: var(--accent); cursor: pointer;
  font-size: 12px; font-weight: 600;
  text-decoration: none;
  transition: opacity .15s;
}
.btn-link:hover { opacity: .75; }

.dish-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.dish-chip  {
  font-size: 11px; padding: 3px 9px;
  background: var(--btn); border: 1px solid var(--btn-border);
  color: var(--muted); border-radius: 10px;
}

/* ── PrimeVue overrides voor dark/light thema ─────────────────────────────── */
.theme-dark :deep(.p-select),
.theme-dark :deep(.p-inputtext),
.theme-dark :deep(.p-textarea) {
  background: var(--inp) !important;
  border-color: var(--inp-border) !important;
  color: rgba(255,255,255,0.9) !important;
}
.theme-dark :deep(.p-select-label)  { color: rgba(255,255,255,0.9) !important; }
.theme-dark :deep(.p-select-overlay){ background: #1c2d3c !important; border-color: var(--inp-border) !important; }
.theme-dark :deep(.p-select-option) { color: rgba(255,255,255,0.85) !important; }
.theme-dark :deep(.p-select-option:hover) { background: rgba(255,255,255,0.08) !important; }

.theme-light :deep(.p-select),
.theme-light :deep(.p-inputtext),
.theme-light :deep(.p-textarea) {
  background: var(--inp) !important;
  border-color: var(--inp-border) !important;
  color: #1a2e1a !important;
}
</style>
