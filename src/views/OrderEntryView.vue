<template>
  <div class="page">
    <!-- Header -->
    <div class="page-header">
      <button class="back-btn" @click="goBack">
        <i class="pi pi-arrow-left" />
      </button>
      <div>
        <h1>{{ t('orderEntry.title') }}</h1>
        <div class="header-meta" v-if="clientName">
          <span class="client-badge">{{ clientName }}</span>
          <span v-if="visitLabel" class="visit-badge">
            <i class="pi pi-calendar" /> {{ visitLabel }}
          </span>
        </div>
      </div>
    </div>

    <!-- Offline banner -->
    <div v-if="!isOnline" class="offline-banner">
      <i class="pi pi-wifi" />
      {{ t('orderEntry.offlineBanner') }}
    </div>

    <div class="order-layout">
      <!-- Left: product zoeker + regels -->
      <div class="order-main">

        <!-- Product zoeker -->
        <div class="card search-card">
          <h3>{{ t('orderEntry.addProduct') }}</h3>
          <div class="search-row">
            <InputText
              v-model="searchQuery"
              :placeholder="t('orderEntry.searchPlaceholder')"
              class="search-input"
              @input="onSearch"
            />
          </div>

          <div v-if="searchResults.length > 0" class="search-results">
            <div
              v-for="p in searchResults"
              :key="p.id"
              class="search-result-row"
              @click="addProduct(p)"
            >
              <div class="sr-info">
                <span class="sr-name">{{ p.name }}</span>
                <span class="sr-sku">{{ p.sku }}</span>
              </div>
              <div class="sr-prices">
                <span v-if="p.pricePerUnit">€ {{ formatPrice(p.pricePerUnit) }}/{{ p.unit }}</span>
                <span v-else-if="p.pricePerKg">€ {{ formatPrice(p.pricePerKg) }}/kg</span>
              </div>
              <Button icon="pi pi-plus" size="small" rounded text />
            </div>
          </div>
          <div v-else-if="searchQuery.length >= 2 && !loadingProducts" class="no-results">
            {{ t('common.noResults') }}
          </div>
        </div>

        <!-- Order regels -->
        <div class="card lines-card">
          <h3>{{ t('orderEntry.orderLines') }} <span class="line-count">({{ lines.length }})</span></h3>

          <div v-if="lines.length === 0" class="empty-lines">
            <i class="pi pi-shopping-cart" />
            <p>{{ t('orderEntry.noLines') }}</p>
          </div>

          <div v-else class="lines-list">
            <div v-for="(line, idx) in lines" :key="idx" class="line-row">
              <div class="line-info">
                <span class="line-name">{{ line.productName }}</span>
                <span class="line-sku" v-if="line.productSku">{{ line.productSku }}</span>
              </div>

              <div class="line-controls">
                <div class="qty-group">
                  <button class="qty-btn" @click="changeQty(idx, -1)">
                    <i class="pi pi-minus" />
                  </button>
                  <InputText
                    v-model.number="line.quantity"
                    type="number"
                    min="0.1"
                    step="0.1"
                    class="qty-input"
                    @change="clampQty(idx)"
                  />
                  <button class="qty-btn" @click="changeQty(idx, 1)">
                    <i class="pi pi-plus" />
                  </button>
                </div>

                <Select
                  v-model="line.unit"
                  :options="unitOptions"
                  class="unit-select"
                />

                <div class="price-group">
                  <span class="price-label">€</span>
                  <InputText
                    v-model.number="line.unitPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    class="price-input"
                  />
                </div>

                <div class="discount-group">
                  <InputText
                    v-model.number="line.discount"
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    class="discount-input"
                    :placeholder="t('orderEntry.discount')"
                  />
                  <span class="discount-pct">%</span>
                </div>

                <span class="line-total">€ {{ formatPrice(lineTotal(line)) }}</span>

                <button class="remove-btn" @click="removeLine(idx)">
                  <i class="pi pi-trash" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: samenvatting + knoppen -->
      <div class="order-sidebar">
        <div class="card summary-card">
          <h3>{{ t('orderEntry.summary') }}</h3>

          <div class="summary-row" v-if="clientName">
            <span class="summary-label">{{ t('orderEntry.client') }}</span>
            <span class="summary-value">{{ clientName }}</span>
          </div>

          <div class="summary-row">
            <span class="summary-label">{{ t('orderEntry.lineCount') }}</span>
            <span class="summary-value">{{ lines.length }}</span>
          </div>

          <div class="summary-row">
            <span class="summary-label">{{ t('orderEntry.subtotal') }}</span>
            <span class="summary-value">€ {{ formatPrice(subtotal) }}</span>
          </div>

          <div class="summary-row total-row">
            <span class="summary-label">{{ t('orderEntry.total') }}</span>
            <span class="summary-value total-value">€ {{ formatPrice(total) }}</span>
          </div>

          <!-- Opmerking -->
          <div class="notes-row">
            <label class="notes-label">{{ t('orderEntry.notes') }}</label>
            <Textarea v-model="notes" :placeholder="t('orderEntry.notesPlaceholder')" rows="3" class="notes-input" />
          </div>

          <div class="action-btns">
            <Button
              :label="t('orderEntry.saveDraft')"
              icon="pi pi-save"
              severity="secondary"
              :loading="saving"
              @click="saveOrder('draft')"
              class="w-full"
            />
            <Button
              :label="t('orderEntry.confirm')"
              icon="pi pi-check"
              :loading="confirming"
              :disabled="lines.length === 0"
              @click="saveOrder('confirmed')"
              class="w-full confirm-btn"
            />
          </div>

          <div v-if="!isOnline" class="offline-note">
            <i class="pi pi-info-circle" />
            {{ t('orderEntry.offlineNote') }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Textarea from 'primevue/textarea'
import Button from 'primevue/button'
import api from '../api/axios.js'
import { createOrder, saveOrder as persistOrder, getOrderById } from '../services/offlineOrderStore.js'

const { t }    = useI18n()
const route    = useRoute()
const router   = useRouter()
const toast    = useToast()

// ── Params ────────────────────────────────────────────────────────────────────
const clientId       = route.params.clientId
const plannedVisitId = route.query.visitId || null
const editId         = route.query.editId  || null   // lokaal UUID bij bewerken

// ── State ─────────────────────────────────────────────────────────────────────
const clientName      = ref('')
const visitLabel      = ref('')
const lines           = ref([])
const notes           = ref('')
const saving          = ref(false)
const confirming      = ref(false)
const searchQuery     = ref('')
const searchResults   = ref([])
const loadingProducts = ref(false)
const allProducts     = ref([])
const isOnline        = ref(navigator.onLine)
const localOrderId    = ref(null)  // huidig lokaal order id

const unitOptions = ['st', 'kg', 'g', 'l', 'dl', 'doos', 'pak', 'zak', 'fles', 'blik']

// ── Lifecycle ─────────────────────────────────────────────────────────────────
onMounted(async () => {
  window.addEventListener('online',  () => { isOnline.value = true })
  window.addEventListener('offline', () => { isOnline.value = false })

  await loadClient()
  await loadProducts()

  if (editId) {
    await loadExistingOrder(editId)
  }
})

async function loadClient() {
  try {
    const res = await api.get(`/clients/${clientId}`)
    const c = res.data?.data
    if (c) clientName.value = c.companyName
  } catch {
    clientName.value = clientId
  }

  if (plannedVisitId) {
    try {
      const res = await api.get(`/visits/${plannedVisitId}`)
      const v = res.data?.data
      if (v) {
        const d = new Date(v.plannedDateTime)
        visitLabel.value = d.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' })
      }
    } catch { /* bezoek niet beschikbaar */ }
  }
}

async function loadProducts() {
  loadingProducts.value = true
  try {
    // Haal alle actieve producten op (max 500)
    const res = await api.get('/products?pageSize=500&onlyActive=true')
    allProducts.value = res.data?.data || []
  } catch {
    // offline of fout — zoeken werkt niet
    allProducts.value = []
  } finally {
    loadingProducts.value = false
  }
}

async function loadExistingOrder(id) {
  const order = await getOrderById(id)
  if (!order) return
  localOrderId.value = id
  notes.value = order.notes || ''
  lines.value = order.lines.map(l => ({
    productId:   l.productId,
    productName: l.productName,
    productSku:  l.productSku || '',
    quantity:    l.quantity,
    unit:        l.unit,
    unitPrice:   l.unitPrice,
    discount:    l.discount ?? 0,
  }))
}

// ── Zoeken ────────────────────────────────────────────────────────────────────
function onSearch() {
  const q = searchQuery.value.trim().toLowerCase()
  if (q.length < 2) {
    searchResults.value = []
    return
  }
  searchResults.value = allProducts.value
    .filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.sku || '').toLowerCase().includes(q)
    )
    .slice(0, 8)
}

// ── Regels beheren ────────────────────────────────────────────────────────────
function addProduct(p) {
  const exists = lines.value.find(l => l.productId === p.id)
  if (exists) {
    exists.quantity += 1
  } else {
    lines.value.push({
      productId:   p.id,
      productName: p.name,
      productSku:  p.sku || '',
      quantity:    1,
      unit:        p.unit || 'st',
      unitPrice:   p.pricePerUnit || p.pricePerKg || 0,
      discount:    0,
    })
  }
  searchQuery.value   = ''
  searchResults.value = []
}

function removeLine(idx) {
  lines.value.splice(idx, 1)
}

function changeQty(idx, delta) {
  const l = lines.value[idx]
  l.quantity = Math.max(0.1, Math.round((l.quantity + delta) * 10) / 10)
}

function clampQty(idx) {
  const l = lines.value[idx]
  if (!l.quantity || l.quantity < 0.1) l.quantity = 0.1
}

// ── Berekeningen ──────────────────────────────────────────────────────────────
function lineTotal(l) {
  const gross = l.quantity * l.unitPrice
  return gross - (gross * (l.discount || 0) / 100)
}

const subtotal = computed(() => lines.value.reduce((sum, l) => sum + lineTotal(l), 0))
const total    = computed(() => subtotal.value)  // btw buiten scope

function formatPrice(v) {
  return (v || 0).toFixed(2).replace('.', ',')
}

// ── Opslaan ───────────────────────────────────────────────────────────────────
async function saveOrder(status) {
  if (status === 'draft') saving.value = true
  else confirming.value = true

  try {
    const orderLines = lines.value.map(l => ({
      productId:   l.productId,
      productName: l.productName,
      productSku:  l.productSku,
      quantity:    l.quantity,
      unit:        l.unit,
      unitPrice:   l.unitPrice,
      discount:    l.discount,
    }))

    if (localOrderId.value) {
      // Bestaande offline bestelling bijwerken
      const existing = await getOrderById(localOrderId.value)
      if (existing) {
        existing.lines  = orderLines
        existing.notes  = notes.value
        existing.status = status
        await persistOrder(existing)
      }
    } else {
      // Nieuwe offline bestelling aanmaken
      const order = await createOrder({
        clientId:       clientId,
        clientName:     clientName.value,
        plannedVisitId: plannedVisitId,
        lines:          orderLines,
      })
      order.notes  = notes.value
      order.status = status
      await persistOrder(order)
      localOrderId.value = order.id
    }

    // Probeer direct te synchen als we online zijn en status = confirmed
    if (status === 'confirmed' && isOnline.value) {
      const { syncPendingOrders } = await import('../services/syncService.js')
      await syncPendingOrders()
    }

    toast.add({
      severity: status === 'draft' ? 'info' : 'success',
      summary:  status === 'draft' ? t('orderEntry.savedDraft') : t('orderEntry.confirmed'),
      life: 3000,
    })

    router.push('/orders')
  } catch (err) {
    console.error(err)
    toast.add({ severity: 'error', summary: t('common.saveFailed'), life: 4000 })
  } finally {
    saving.value    = false
    confirming.value = false
  }
}

function goBack() {
  if (window.history.length > 1) router.back()
  else router.push(`/clients/${clientId}`)
}
</script>

<style scoped>
.page { padding: 24px; max-width: 1200px; margin: 0 auto; }

.page-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 20px;
}

.page-header h1 { margin: 0 0 4px; font-size: 22px; color: #1a2e1a; }

.back-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #555;
  padding: 4px;
  border-radius: 6px;
  margin-top: 4px;
  transition: background .15s;
}
.back-btn:hover { background: #e8f0e8; }

.header-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

.client-badge {
  background: #e8f5e9;
  color: #2d6a4f;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 500;
}

.visit-badge {
  background: #e3f2fd;
  color: #1565c0;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 4px;
}

/* ── Offline banner ─────────────────────────────────────────────────────────── */
.offline-banner {
  background: #fff3e0;
  border: 1px solid #ffb74d;
  color: #e65100;
  border-radius: 8px;
  padding: 10px 16px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

/* ── Layout ─────────────────────────────────────────────────────────────────── */
.order-layout {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 20px;
  align-items: start;
}

@media (max-width: 900px) {
  .order-layout { grid-template-columns: 1fr; }
}

.card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 4px rgba(0,0,0,.06);
  margin-bottom: 16px;
}

.card h3 {
  margin: 0 0 14px;
  font-size: 15px;
  color: #1a2e1a;
  font-weight: 600;
}

.line-count { font-weight: 400; color: #888; }

/* ── Product zoeker ─────────────────────────────────────────────────────────── */
.search-row { margin-bottom: 8px; }
.search-input { width: 100%; }

.search-results {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
}

.search-result-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  cursor: pointer;
  border-bottom: 1px solid #f5f5f5;
  transition: background .15s;
}

.search-result-row:last-child { border-bottom: none; }
.search-result-row:hover { background: #f1f8f1; }

.sr-info { flex: 1; min-width: 0; }
.sr-name { font-size: 14px; font-weight: 500; display: block; }
.sr-sku  { font-size: 12px; color: #888; }
.sr-prices { font-size: 13px; color: #2d6a4f; white-space: nowrap; }

.no-results { color: #888; font-size: 14px; padding: 8px 0; }

/* ── Order regels ───────────────────────────────────────────────────────────── */
.empty-lines {
  text-align: center;
  padding: 32px 0;
  color: #aaa;
}
.empty-lines i { font-size: 32px; margin-bottom: 8px; display: block; }
.empty-lines p { margin: 0; font-size: 14px; }

.lines-list { display: flex; flex-direction: column; gap: 10px; }

.line-row {
  border: 1px solid #e8ede8;
  border-radius: 8px;
  padding: 12px 14px;
}

.line-info { margin-bottom: 8px; }
.line-name { font-size: 14px; font-weight: 500; color: #1a2e1a; }
.line-sku  { font-size: 12px; color: #888; margin-left: 8px; }

.line-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.qty-group {
  display: flex;
  align-items: center;
  gap: 4px;
}

.qty-btn {
  background: #f0f4f0;
  border: none;
  border-radius: 6px;
  width: 28px;
  height: 28px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #2d6a4f;
  font-size: 12px;
  transition: background .15s;
}
.qty-btn:hover { background: #dceadc; }

.qty-input {
  width: 60px !important;
  text-align: center;
  padding: 4px 6px !important;
}

.unit-select { width: 80px; }

.price-group, .discount-group {
  display: flex;
  align-items: center;
  gap: 2px;
}

.price-label, .discount-pct {
  font-size: 13px;
  color: #666;
}

.price-input    { width: 70px !important; }
.discount-input { width: 50px !important; }

.line-total {
  font-weight: 600;
  color: #2d6a4f;
  font-size: 14px;
  margin-left: auto;
}

.remove-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #e57373;
  padding: 4px 6px;
  border-radius: 6px;
  transition: background .15s;
}
.remove-btn:hover { background: #fce4e4; }

/* ── Samenvatting sidebar ───────────────────────────────────────────────────── */
.summary-card { position: sticky; top: 24px; }

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px solid #f5f5f5;
  font-size: 14px;
}
.summary-row:last-of-type { border-bottom: none; }

.summary-label { color: #666; }
.summary-value { font-weight: 500; }

.total-row { margin-top: 4px; border-top: 2px solid #e0e0e0; padding-top: 10px; }
.total-value { font-size: 18px; font-weight: 700; color: #2d6a4f; }

.notes-row { margin: 16px 0 12px; }
.notes-label { font-size: 13px; color: #666; margin-bottom: 6px; display: block; }
.notes-input { width: 100%; }

.action-btns {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.confirm-btn { background: var(--green-light, #2d6a4f) !important; }

.w-full { width: 100%; }

.offline-note {
  margin-top: 10px;
  font-size: 12px;
  color: #e65100;
  display: flex;
  align-items: flex-start;
  gap: 6px;
  line-height: 1.4;
}
</style>
