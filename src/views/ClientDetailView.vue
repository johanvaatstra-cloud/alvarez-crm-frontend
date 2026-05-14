<template>
  <div class="page">
    <!-- Back + title -->
    <div class="page-header">
      <button class="back-btn" @click="router.push('/clients')">
        <i class="pi pi-arrow-left" />
      </button>
      <div v-if="client">
        <h1>{{ client.companyName }}</h1>
        <div class="header-meta">
          <Tag :value="typeLabel(client.crmClientType)" :severity="typeSeverity(client.crmClientType)" />
          <Tag :value="client.isActive ? t('common.active') : t('common.inactive')" :severity="client.isActive ? 'success' : 'secondary'" />
        </div>
      </div>
      <div v-else-if="loading">
        <div class="skeleton-title" />
      </div>
    </div>

    <div v-if="error" class="error-msg">
      <Message severity="error" :closable="false">{{ error }}</Message>
    </div>

    <Tabs v-if="client" v-model:value="activeTab">
      <TabList>
        <Tab value="info"><i class="pi pi-info-circle" /> {{ t('clientDetail.tabInfo') }}</Tab>
        <Tab value="visits"><i class="pi pi-calendar" /> {{ t('clientDetail.tabVisits') }}</Tab>
        <Tab value="orders"><i class="pi pi-shopping-cart" /> {{ t('clientDetail.tabOrders') }}</Tab>
        <Tab value="reports"><i class="pi pi-file-edit" /> {{ t('clientDetail.tabReports') }}</Tab>
        <Tab value="suggestions"><i class="pi pi-star" /> {{ t('clientDetail.tabSuggestions') }}</Tab>
      </TabList>

      <TabPanels>
        <!-- ── Info ─────────────────────────────────────────────────────── -->
        <TabPanel value="info">
          <div class="tab-content">
            <div class="info-grid">
              <div class="info-card">
                <h3>{{ t('clientDetail.companyData') }}</h3>
                <dl>
                  <dt>{{ t('clients.companyName') }}</dt><dd>{{ client.companyName }}</dd>
                  <dt>{{ t('clientDetail.vatNumber') }}</dt><dd>{{ client.vatNumber || '—' }}</dd>
                  <dt>{{ t('clientDetail.contactPerson') }}</dt><dd>{{ client.contactName }}</dd>
                  <dt>{{ t('common.email') }}</dt><dd>{{ client.email }}</dd>
                  <dt>{{ t('common.phone') }}</dt><dd>{{ client.phone || '—' }}</dd>
                </dl>
              </div>

              <div class="info-card">
                <h3>{{ t('clientDetail.crmData') }}</h3>
                <div class="field">
                  <label>{{ t('clientDetail.clientType') }}</label>
                  <Select
                    v-model="form.clientType"
                    :options="clientTypeOptions"
                    option-label="label"
                    option-value="value"
                    :placeholder="t('clientDetail.selectType')"
                  />
                </div>
                <div class="field">
                  <label>{{ t('clientDetail.notes') }}</label>
                  <Textarea
                    v-model="form.notes"
                    rows="5"
                    :placeholder="t('clientDetail.notesPlaceholder')"
                    auto-resize
                  />
                </div>
                <Button
                  :label="t('common.save')"
                  :loading="saving"
                  @click="saveInfo"
                  class="save-btn"
                />
              </div>

              <!-- Medewerker overdragen (admin only) -->
              <div v-if="isAdmin" class="info-card assign-card">
                <h3>{{ t('clientDetail.responsibleEmployee') }}</h3>
                <div class="current-rep" v-if="client.salesRepName">
                  <i class="pi pi-user" />
                  <span>{{ client.salesRepName }}</span>
                </div>
                <div class="current-rep unassigned" v-else>
                  <i class="pi pi-user" />
                  <span>{{ t('clientDetail.unassigned') }}</span>
                </div>
                <div class="field" style="margin-top: 14px;">
                  <label>{{ t('clientDetail.transferTo') }}</label>
                  <Select
                    v-model="form.salesRepId"
                    :options="salesReps"
                    option-label="fullName"
                    option-value="id"
                    :placeholder="t('clientDetail.chooseEmployee')"
                    show-clear
                    :loading="loadingSalesReps"
                  />
                </div>
                <Button
                  :label="t('clientDetail.transfer')"
                  icon="pi pi-arrow-right-arrow-left"
                  :loading="assigning"
                  :disabled="form.salesRepId === (client.crmSalesRepId ?? null)"
                  @click="assignSalesRep"
                  class="save-btn"
                />
              </div>
            </div>
          </div>
        </TabPanel>

        <!-- ── Bezoeken ─────────────────────────────────────────────────── -->
        <TabPanel value="visits">
          <div class="tab-content">
            <div class="visits-header">
              <h3>{{ t('clientDetail.plannedVisits') }}</h3>
              <Button v-if="!isAdmin" :label="t('clientDetail.planVisit')" icon="pi pi-plus" size="small" @click="showVisitForm = true" />
            </div>

            <div v-if="loadingVisits" class="loading-visits">
              <i class="pi pi-spin pi-spinner" /> {{ t('common.loading') }}
            </div>

            <div v-else-if="visits.length === 0" class="stub-panel">
              <i class="pi pi-calendar" />
              <p>{{ t('clientDetail.noVisits') }}</p>
            </div>

            <div v-else class="visits-list">
              <div v-for="v in visits" :key="v.id" class="visit-row">
                <div class="visit-row-date">
                  <span class="vr-day">{{ formatVisitDay(v.plannedDateTime) }}</span>
                  <span class="vr-time">{{ formatVisitTime(v.plannedDateTime) }}</span>
                </div>
                <div class="visit-row-body">
                  <div class="vr-purpose">{{ v.purpose }}</div>
                  <div class="vr-dur">{{ v.estimatedDurationMinutes }} min</div>
                </div>
                <Tag :value="statusLabel(v.status)" :severity="statusSeverity(v.status)" />
                <Button
                  v-if="v.status === 'Scheduled'"
                  :label="t('clientDetail.enterOrder')"
                  icon="pi pi-shopping-cart"
                  size="small"
                  severity="secondary"
                  class="visit-order-btn"
                  @click="router.push(`/clients/${route.params.id}/order/new?visitId=${v.id}`)"
                />
              </div>
            </div>
          </div>

          <VisitFormDialog
            v-model="showVisitForm"
            :fixed-client-id="route.params.id"
            @saved="loadVisits"
          />
        </TabPanel>

        <!-- ── Orders ───────────────────────────────────────────────────── -->
        <TabPanel value="orders">
          <div class="tab-content">
            <div class="visits-header">
              <h3>{{ t('clientDetail.orders') }}</h3>
              <Button
                :label="t('clientDetail.newOrder')"
                icon="pi pi-plus"
                size="small"
                @click="router.push(`/clients/${route.params.id}/order/new`)"
              />
            </div>

            <div v-if="loadingOrders" class="loading-visits">
              <i class="pi pi-spin pi-spinner" /> {{ t('common.loading') }}
            </div>

            <div v-else-if="clientOrders.length === 0" class="stub-panel">
              <i class="pi pi-shopping-cart" />
              <p>{{ t('clientDetail.noOrders') }}</p>
            </div>

            <div v-else class="visits-list">
              <div
                v-for="o in clientOrders"
                :key="o.id"
                class="visit-row order-row"
                @click="router.push(`/orders`)"
              >
                <div class="visit-row-date">
                  <span class="vr-day">{{ formatVisitDay(o.orderDate || o.createdAt) }}</span>
                  <span class="vr-time">{{ o.lines?.length ?? 0 }} {{ t('clientDetail.orderLines') }}</span>
                </div>
                <div class="visit-row-body">
                  <div class="vr-purpose">€ {{ formatOrderTotal(o) }}</div>
                </div>
                <Tag :value="orderStatusLabel(o.status)" :severity="orderStatusSeverity(o.status)" />
                <i class="pi pi-chevron-right report-arrow" />
              </div>
            </div>
          </div>
        </TabPanel>

        <!-- ── Rapporten ─────────────────────────────────────────────────── -->
        <TabPanel value="reports">
          <div class="tab-content">
            <div class="visits-header">
              <h3>{{ t('clientDetail.visitReports') }}</h3>
              <Button v-if="!isAdmin" :label="t('clientDetail.newReport')" icon="pi pi-plus" size="small" @click="showReportForm = true" />
            </div>

            <div v-if="loadingReports" class="loading-visits">
              <i class="pi pi-spin pi-spinner" /> {{ t('common.loading') }}
            </div>

            <div v-else-if="reports.length === 0" class="stub-panel">
              <i class="pi pi-file-edit" />
              <p>{{ t('clientDetail.noReports') }}</p>
            </div>

            <div v-else class="visits-list">
              <div
                v-for="r in reports"
                :key="r.id"
                class="visit-row report-row"
                @click="router.push(`/reports/${r.id}`)"
              >
                <div class="visit-row-date">
                  <span class="vr-day">{{ formatVisitDay(r.visitDate) }}</span>
                  <span class="vr-time">{{ r.orderLineCount }} {{ t('clientDetail.products') }}</span>
                </div>
                <div class="visit-row-body">
                  <div class="vr-purpose">{{ r.hasAudio ? t('clientDetail.audioRecorded') : t('clientDetail.noAudio') }}</div>
                </div>
                <Tag :value="reportStatusLabel(r.status)" :severity="reportStatusSeverity(r.status)" />
                <i class="pi pi-chevron-right report-arrow" />
              </div>
            </div>
          </div>

          <ReportFormDialog
            v-model="showReportForm"
            :fixed-client-id="route.params.id"
            @saved="loadReports"
          />
        </TabPanel>

        <!-- ── Suggesties ────────────────────────────────────────────────── -->
        <TabPanel value="suggestions">
          <div class="suggestions-panel">

            <!-- Menu scraper card -->
            <div v-if="isAdmin" class="card">
              <div class="card-header-row">
                <div class="card-title">
                  <i class="pi pi-globe" />
                  <h3>{{ t('clientDetail.menuScrape') }}</h3>
                </div>
                <span v-if="menu" class="fetched-at">{{ t('clientDetail.scrapedOn') }} {{ formatMenuDate(menu.fetchedAt) }}</span>
              </div>

              <div class="scrape-input-row">
                <InputText
                  v-model="menuUrl"
                  placeholder="https://restaurant.nl/menu"
                  class="url-input"
                  :disabled="scraping || uploading"
                />
                <Button
                  :label="t('clientDetail.scrapeMenu')"
                  icon="pi pi-refresh"
                  :loading="scraping"
                  :disabled="uploading"
                  @click="scrapeMenu"
                />
              </div>

              <div class="upload-row">
                <span class="upload-label">{{ t('clientDetail.uploadMenuOr') }}</span>
                <input
                  ref="menuFileInput"
                  type="file"
                  accept="image/*,.pdf"
                  style="display:none"
                  @change="uploadMenu"
                />
                <Button
                  :label="t('clientDetail.uploadFile')"
                  icon="pi pi-upload"
                  severity="secondary"
                  outlined
                  size="small"
                  :loading="uploading"
                  :disabled="scraping"
                  @click="menuFileInput.click()"
                /></div>

              <!-- Dishes -->
              <div v-if="menu && menu.dishes.length > 0" class="dishes-section">
                <p class="dishes-label">{{ t('clientDetail.dishesFound') }} ({{ menu.dishes.length }})</p>
                <div class="dish-chips">
                  <span v-for="dish in menu.dishes" :key="dish" class="dish-chip">{{ dish }}</span>
                </div>
              </div>
              <div v-else-if="menu && menu.dishes.length === 0" class="empty-dishes">
                {{ t('clientDetail.noDishesFound') }}
              </div>
              <div v-else-if="!menu && !scraping" class="empty-dishes">
                {{ t('clientDetail.enterMenuUrl') }}
              </div>
            </div>

            <!-- Product suggestions card -->
            <div class="card">
              <div class="card-header-row">
                <div class="card-title">
                  <i class="pi pi-star" />
                  <h3>{{ t('clientDetail.productAdvice') }}</h3>
                </div>
                <Button
                  v-if="isAdmin"
                  :label="t('clientDetail.generateAdvice')"
                  icon="pi pi-sparkles"
                  size="small"
                  :loading="generatingSuggestions"
                  @click="generateSuggestions"
                />
              </div>

              <div v-if="suggestions.length === 0 && !generatingSuggestions" class="empty-dishes">
                {{ isAdmin ? t('clientDetail.generateAdviceHint') : t('clientDetail.noAdviceYet') }}
              </div>

              <div class="suggestion-list">
                <div
                  v-for="s in suggestions"
                  :key="s.id"
                  class="suggestion-card"
                  :class="{
                    accepted: s.wasAccepted === true,
                    rejected: s.wasAccepted === false,
                    'type-promo': s.suggestionType === 'Promotion',
                    'type-new': s.suggestionType === 'NewProduct'
                  }"
                >
                  <div class="suggestion-info">
                    <div class="suggestion-product-row">
                      <span class="suggestion-product">{{ s.productName }}</span>
                      <span v-if="s.suggestionType === 'Promotion'" class="type-badge badge-promo">
                        <i class="pi pi-tag" /> {{ t('clientDetail.promotion') }}
                      </span>
                      <span v-else-if="s.suggestionType === 'NewProduct'" class="type-badge badge-new">
                        <i class="pi pi-sparkles" /> {{ t('clientDetail.new') }}
                      </span>
                    </div>
                    <span v-if="s.categoryName" class="suggestion-category">{{ s.categoryName }}</span>
                    <p v-if="s.promotionText" class="suggestion-promo-text">
                      <i class="pi pi-tag" /> {{ s.promotionText }}
                    </p>
                    <p class="suggestion-reason">{{ s.reason }}</p>
                  </div>
                  <div class="suggestion-actions">
                    <Button
                      v-if="s.wasAccepted !== true"
                      icon="pi pi-check"
                      text
                      severity="success"
                      size="small"
                      v-tooltip="t('clientDetail.accept')"
                      @click="updateSuggestion(s.id, true)"
                    />
                    <Button
                      v-if="s.wasAccepted !== false"
                      icon="pi pi-times"
                      text
                      severity="secondary"
                      size="small"
                      v-tooltip="t('clientDetail.reject')"
                      @click="updateSuggestion(s.id, false)"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabPanel>
      </TabPanels>
    </Tabs>
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
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import Tag from 'primevue/tag'
import Select from 'primevue/select'
import Textarea from 'primevue/textarea'
import Button from 'primevue/button'
import Message from 'primevue/message'
import InputText from 'primevue/inputtext'
import VisitFormDialog from '../components/VisitFormDialog.vue'
import ReportFormDialog from '../components/ReportFormDialog.vue'
import { useAuthStore } from '../stores/auth'
import { cacheClients } from '../services/offlineClientCache.js'

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const activeTab = ref(typeof route.query.tab === 'string' ? route.query.tab : 'info')
const toast = useToast()
const { isAdmin } = useAuthStore()

const DFNS_LOCALES = { nl, en: enGB, es, ca }
const dateFnsLocale = computed(() => DFNS_LOCALES[locale.value] ?? nl)

const client = ref(null)
const loading = ref(true)
const saving = ref(false)
const error = ref('')

// Visits tab
const visits = ref([])
const loadingVisits = ref(false)
const showVisitForm = ref(false)

const STATUS_LABELS = { Scheduled: 'agenda.statusPlanned', Completed: 'agenda.statusCompleted', Cancelled: 'agenda.statusCancelled', NoShow: 'agenda.statusNoShow' }
const STATUS_SEVERITY = { Scheduled: 'info', Completed: 'success', Cancelled: 'secondary', NoShow: 'warn' }
function statusLabel(s) { return STATUS_LABELS[s] ? t(STATUS_LABELS[s]) : s }
function statusSeverity(s) { return STATUS_SEVERITY[s] ?? 'secondary' }
function formatVisitDay(dt) { return format(parseISO(dt), 'd MMM yyyy', { locale: dateFnsLocale.value }) }
function formatVisitTime(dt) { return format(parseISO(dt), 'HH:mm') }

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

// Orders tab
const clientOrders   = ref([])
const loadingOrders  = ref(false)

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
  const map = { Draft: t('orders.statusDraft'), Confirmed: t('orders.statusConfirmed'), SentToErp: t('orders.statusSentToErp'), ProcessedByErp: t('orders.statusProcessed') }
  return map[s] || s
}
function orderStatusSeverity(s) {
  const map = { Draft: 'secondary', Confirmed: 'info', SentToErp: 'warn', ProcessedByErp: 'success' }
  return map[s] || 'secondary'
}
function formatOrderTotal(o) {
  const v = o.totalAmount ?? (o.lines?.reduce((sum, l) => sum + l.quantity * l.unitPrice * (1 - (l.discount || 0) / 100), 0) ?? 0)
  return v.toFixed(2).replace('.', ',')
}

// Reports tab
const reports = ref([])
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

const form = reactive({ notes: '', clientType: 'Restaurant', salesRepId: null })

const clientTypeOptions = computed(() => [
  { label: t('clients.typeRestaurant'), value: 'Restaurant' },
  { label: t('clients.typeHotel'), value: 'Hotel' },
  { label: t('clients.typeCatering'), value: 'Catering' },
  { label: t('clients.typeOther'), value: 'Other' }
])

const TYPE_LABELS = { Restaurant: 'clients.typeRestaurant', Hotel: 'clients.typeHotel', Catering: 'clients.typeCatering', Other: 'clients.typeOther' }
const TYPE_SEVERITY = { Restaurant: 'info', Hotel: 'warn', Catering: 'success', Other: 'secondary' }

function typeLabel(type) { return TYPE_LABELS[type] ? t(TYPE_LABELS[type]) : type }
function typeSeverity(type) { return TYPE_SEVERITY[type] ?? 'secondary' }

async function load() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.get(`/clients/${route.params.id}`)
    client.value = data.data
    form.notes = data.data.crmNotes ?? ''
    form.clientType = data.data.crmClientType ?? 'Restaurant'
    form.salesRepId = data.data.crmSalesRepId ?? null
    cacheClients([data.data])   // cache voor offline gebruik in OrderEntryView
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
    await api.patch(`/clients/${route.params.id}`, {
      notes: form.notes,
      clientType: form.clientType
    })
    client.value.crmNotes = form.notes
    client.value.crmClientType = form.clientType
    toast.add({ severity: 'success', summary: t('clientDetail.savedSuccess'), life: 3000 })
  } catch {
    toast.add({ severity: 'error', summary: t('clientDetail.saveFailed'), life: 3000 })
  } finally {
    saving.value = false
  }
}

// Sales rep assignment (admin only)
const salesReps = ref([])
const loadingSalesReps = ref(false)
const assigning = ref(false)

async function loadSalesReps() {
  if (!isAdmin) return
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
    client.value.salesRepName = rep?.fullName ?? null
    toast.add({
      severity: 'success',
      summary: rep ? `${t('clientDetail.transferredTo')} ${rep.fullName}` : t('clientDetail.employeeDetached'),
      life: 3000
    })
  } catch {
    toast.add({ severity: 'error', summary: t('clientDetail.transferFailed'), life: 3000 })
  } finally {
    assigning.value = false
  }
}

// Suggestions / menu tab
const menu = ref(null)
const menuUrl = ref('')
const scraping = ref(false)
const uploading = ref(false)
const menuFileInput = ref(null)

// Product suggestions
const suggestions = ref([])
const generatingSuggestions = ref(false)

async function loadSuggestions() {
  try {
    const { data } = await api.get(`/clients/${route.params.id}/suggestions`)
    suggestions.value = data.data
  } catch {
    suggestions.value = []
  }
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

function formatMenuDate(d) { return format(parseISO(d), 'd MMMM yyyy HH:mm', { locale: dateFnsLocale.value }) }

async function loadMenu() {
  try {
    const { data } = await api.get(`/clients/${route.params.id}/menu`)
    menu.value = data.data
    if (data.data?.sourceUrl) menuUrl.value = data.data.sourceUrl
  } catch {
    menu.value = null
  }
}

async function uploadMenu(e) {
  const file = e.target.files[0]
  if (!file) return
  menuFileInput.value.value = ''
  uploading.value = true
  try {
    const fd = new FormData()
    fd.append('file', file)
    const { data } = await api.post(`/clients/${route.params.id}/menu/upload`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    menu.value = data.data
    toast.add({ severity: 'success', summary: t('clientDetail.menuRead'), detail: `${data.data.dishes.length} ${t('clientDetail.dishesFoundToast')}`, life: 4000 })
  } catch (e) {
    toast.add({ severity: 'error', summary: t('clientDetail.uploadFailed'), detail: e.response?.data?.error ?? '', life: 4000 })
  } finally {
    uploading.value = false
  }
}

async function scrapeMenu() {
  if (!menuUrl.value.trim()) return
  scraping.value = true
  try {
    const { data } = await api.post(`/clients/${route.params.id}/menu/scrape`, { url: menuUrl.value.trim() })
    menu.value = data.data
    toast.add({ severity: 'success', summary: t('clientDetail.menuScraped'), detail: `${data.data.dishes.length} ${t('clientDetail.dishesFoundToast')}`, life: 4000 })
  } catch (e) {
    toast.add({ severity: 'error', summary: t('clientDetail.scrapeFailed'), detail: e.response?.data?.error ?? '', life: 4000 })
  } finally {
    scraping.value = false
  }
}

onMounted(() => { load(); loadVisits(); loadReports(); loadClientOrders(); loadMenu(); loadSuggestions(); loadSalesReps() })
</script>

<style scoped>
.page {
  padding: 32px;
  max-width: 1200px;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.back-btn {
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #495057;
  transition: background 0.15s;
  flex-shrink: 0;
}

.back-btn:hover {
  background: #f1f5f2;
}

.page-header h1 {
  font-size: 22px;
  font-weight: 700;
  color: #1b4332;
  margin: 0 0 6px;
}

.header-meta {
  display: flex;
  gap: 8px;
}

.skeleton-title {
  height: 28px;
  width: 200px;
  background: #e9ecef;
  border-radius: 6px;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.error-msg {
  margin-bottom: 16px;
}

/* ── Tabs ─────────────────────────────────────────────────────────────────── */
:deep(.p-tabs) {
  background: transparent;
}

:deep(.p-tablist) {
  background: white;
  border-radius: 12px 12px 0 0;
  padding: 0 16px;
  border-bottom: 1px solid #e9ecef;
}

:deep(.p-tab) {
  gap: 6px;
}

:deep(.p-tabpanels) {
  background: white;
  border-radius: 0 0 12px 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.tab-content {
  padding: 24px;
}

.assign-card {
  border-top: 2px solid #f1f3f5;
}

.current-rep {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #212529;
  background: #e9f5ee;
  border-radius: 8px;
  padding: 8px 12px;
}

.current-rep.unassigned {
  color: #adb5bd;
  background: #f8f9fa;
}

.current-rep .pi { color: #2d6a4f; }
.current-rep.unassigned .pi { color: #ced4da; }

/* ── Info grid ────────────────────────────────────────────────────────────── */
.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

@media (max-width: 900px) {
  .info-grid { grid-template-columns: 1fr; }
}

.info-card {
  background: #f8f9fa;
  border-radius: 10px;
  padding: 20px;
}

.info-card h3 {
  font-size: 13px;
  font-weight: 600;
  color: #6c757d;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0 0 16px;
}

dl {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 6px 16px;
  margin: 0;
}

dt {
  font-size: 13px;
  color: #6c757d;
  font-weight: 500;
}

dd {
  font-size: 14px;
  color: #212529;
  margin: 0;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
}

.field label {
  font-size: 13px;
  font-weight: 500;
  color: #495057;
}

.field :deep(.p-select),
.field :deep(.p-textarea) {
  width: 100%;
}

.save-btn {
  background: var(--green-primary) !important;
  border-color: var(--green-primary) !important;
}

.save-btn:hover {
  background: var(--green-dark) !important;
  border-color: var(--green-dark) !important;
}

/* ── Visits tab ──────────────────────────────────────────────────────────── */
.visits-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.visits-header h3 {
  font-size: 14px;
  font-weight: 600;
  color: #212529;
  margin: 0;
}

.loading-visits {
  padding: 32px;
  text-align: center;
  color: #6c757d;
  font-size: 14px;
}

.visits-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.visit-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 3px solid #339af0;
  flex-wrap: wrap;
}

.visit-order-btn { margin-left: auto; flex-shrink: 0; }

.visit-row-date {
  display: flex;
  flex-direction: column;
  min-width: 90px;
}

.vr-day {
  font-size: 13px;
  font-weight: 600;
  color: #212529;
}

.vr-time {
  font-size: 12px;
  color: #6c757d;
}

.visit-row-body {
  flex: 1;
}

.vr-purpose {
  font-size: 13px;
  font-weight: 500;
  color: #212529;
  margin-bottom: 2px;
}

.vr-dur {
  font-size: 11px;
  color: #868e96;
}

/* ── Stub panels ─────────────────────────────────────────────────────────── */
.stub-panel {
  text-align: center;
  padding: 64px 32px;
  color: #adb5bd;
}

.stub-panel i {
  font-size: 40px;
  display: block;
  margin-bottom: 12px;
}

.stub-panel p {
  margin: 0;
  font-size: 14px;
}

/* ── Suggesties / menu scraper ──────────────────────────────────────────── */
.suggestions-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.07);
}

.card-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-title i {
  color: #2d6a4f;
  font-size: 15px;
}

.card-title h3 {
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #6c757d;
  margin: 0;
}

.fetched-at {
  font-size: 12px;
  color: #adb5bd;
}

.scrape-input-row {
  display: flex;
  gap: 8px;
}

.url-input {
  flex: 1;
}

.upload-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
}

.upload-label {
  font-size: 12px;
  color: #adb5bd;
}

.dishes-section {
  margin-top: 16px;
}

.dishes-label {
  font-size: 12px;
  font-weight: 600;
  color: #6c757d;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  margin: 0 0 10px;
}

.dish-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.dish-chip {
  background: #e9f5ee;
  color: #2d6a4f;
  border-radius: 20px;
  padding: 4px 12px;
  font-size: 13px;
  font-weight: 500;
}

.empty-dishes {
  font-size: 13px;
  color: #adb5bd;
  margin-top: 12px;
}

.suggestions-placeholder .empty-dishes {
  margin-top: 0;
}

/* ── Suggestion cards ─────────────────────────────────────────────────────── */
.suggestion-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 4px;
}

.suggestion-card {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 8px;
  background: #f8f9fa;
  border-left: 3px solid #dee2e6;
  transition: border-color 0.15s;
}

.suggestion-card.accepted {
  border-left-color: #2d6a4f;
  background: #f0faf4;
}

.suggestion-card.type-promo {
  border-left-color: #f59f00;
  background: #fffbe6;
}

.suggestion-card.type-new {
  border-left-color: #2f9e44;
  background: #f0fdf4;
}

.suggestion-card.rejected {
  border-left-color: #dee2e6;
  opacity: 0.55;
}

.suggestion-info {
  flex: 1;
  min-width: 0;
}

.suggestion-product-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.suggestion-product {
  font-size: 14px;
  font-weight: 600;
  color: #212529;
}

.type-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 20px;
  letter-spacing: 0.2px;
}

.badge-promo {
  background: #fff3bf;
  color: #e67700;
  border: 1px solid #ffe066;
}

.badge-new {
  background: #d3f9d8;
  color: #2f9e44;
  border: 1px solid #8ce99a;
}

.suggestion-category {
  font-size: 11px;
  color: #868e96;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  display: block;
  margin-top: 2px;
}

.suggestion-promo-text {
  font-size: 12px;
  color: #e67700;
  font-weight: 500;
  margin: 4px 0 0;
  display: flex;
  align-items: center;
  gap: 5px;
}

.suggestion-promo-text .pi {
  font-size: 11px;
}

.suggestion-reason {
  font-size: 13px;
  color: #495057;
  margin: 6px 0 0;
}

.suggestion-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}
</style>
