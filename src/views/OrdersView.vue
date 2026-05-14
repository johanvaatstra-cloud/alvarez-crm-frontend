<template>
  <div class="page">
    <div class="page-header">
      <h1>{{ t('orders.title') }}</h1>
      <div class="header-actions">
        <Button
          :label="t('orders.syncNow')"
          icon="pi pi-refresh"
          severity="secondary"
          size="small"
          :loading="syncing"
          @click="handleSync"
        />
      </div>
    </div>

    <!-- Offline badge -->
    <div v-if="!isOnline" class="offline-banner">
      <i class="pi pi-wifi" />
      {{ t('orderEntry.offlineBanner') }}
    </div>

    <!-- Filters -->
    <div class="filters card">
      <Select
        v-model="filterStatus"
        :options="statusOptions"
        option-label="label"
        option-value="value"
        :placeholder="t('orders.allStatuses')"
        class="filter-select"
        show-clear
      />
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <i class="pi pi-spin pi-spinner" /> {{ t('common.loading') }}
    </div>

    <!-- Lege state -->
    <div v-else-if="rows.length === 0" class="empty-state card">
      <i class="pi pi-shopping-cart" />
      <p>{{ t('orders.noOrders') }}</p>
    </div>

    <!-- Tabel -->
    <div v-else class="card table-card">
      <table class="orders-table">
        <thead>
          <tr>
            <th>{{ t('orders.client') }}</th>
            <th>{{ t('orders.date') }}</th>
            <th>{{ t('orders.lines') }}</th>
            <th>{{ t('orders.total') }}</th>
            <th>{{ t('orders.status') }}</th>
            <th>{{ t('orders.source') }}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in filteredRows"
            :key="row.key"
            class="order-row"
            @click="openOrder(row)"
          >
            <td class="td-client">{{ row.clientName || row.clientId }}</td>
            <td class="td-date">{{ formatDate(row.orderDate || row.createdAt) }}</td>
            <td class="td-lines">{{ row.lines?.length ?? '—' }}</td>
            <td class="td-total">
              <span v-if="row.totalAmount != null">€ {{ formatPrice(row.totalAmount) }}</span>
              <span v-else-if="row.lines">€ {{ formatPrice(calcTotal(row.lines)) }}</span>
              <span v-else>—</span>
            </td>
            <td class="td-status">
              <Tag :value="statusLabel(row.status)" :severity="statusSeverity(row.status)" />
            </td>
            <td class="td-source">
              <span v-if="row._offline" class="offline-badge">
                <i class="pi pi-database" /> {{ t('orders.offline') }}
              </span>
              <span v-else class="online-badge">
                <i class="pi pi-cloud" /> {{ t('orders.online') }}
              </span>
            </td>
            <td class="td-actions">
              <Button
                v-if="row._offline && row.status === 'draft'"
                icon="pi pi-pencil"
                text
                rounded
                size="small"
                @click.stop="editOfflineOrder(row)"
              />
              <Button
                v-if="row._offline && row.status !== 'synced'"
                icon="pi pi-trash"
                text
                rounded
                size="small"
                severity="danger"
                @click.stop="confirmDelete(row)"
              />
              <i v-if="!row._offline" class="pi pi-chevron-right row-arrow" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Verwijder bevestiging -->
    <Dialog
      v-model:visible="showDeleteDialog"
      :header="t('orders.deleteTitle')"
      modal
      :style="{ width: '380px' }"
    >
      <p>{{ t('orders.deleteConfirm') }}</p>
      <template #footer>
        <Button :label="t('common.cancel')" text @click="showDeleteDialog = false" />
        <Button :label="t('common.delete')" severity="danger" @click="doDelete" />
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'
import Select from 'primevue/select'
import Tag    from 'primevue/tag'
import Dialog from 'primevue/dialog'
import api from '../api/axios.js'
import { getAllOrders, deleteOrder } from '../services/offlineOrderStore.js'
import { syncPendingOrders } from '../services/syncService.js'

const { t }  = useI18n()
const router = useRouter()
const toast  = useToast()

const loading       = ref(false)
const syncing       = ref(false)
const rows          = ref([])
const filterStatus  = ref(null)
const isOnline      = ref(navigator.onLine)
const showDeleteDialog = ref(false)
const toDeleteOrder    = ref(null)

const statusOptions = computed(() => [
  { label: t('orders.statusDraft'),     value: 'draft'          },
  { label: t('orders.statusConfirmed'), value: 'confirmed'      },
  { label: t('orders.statusSentToErp'), value: 'SentToErp'      },
  { label: t('orders.statusProcessed'), value: 'ProcessedByErp' },
  { label: t('orders.statusSynced'),    value: 'synced'         },
])

onMounted(async () => {
  window.addEventListener('online',  () => { isOnline.value = true;  loadAll() })
  window.addEventListener('offline', () => { isOnline.value = false })
  await loadAll()
})

async function loadAll() {
  loading.value = true
  try {
    const [offlineOrders, serverOrders] = await Promise.allSettled([
      getAllOrders(),
      api.get('/orders?pageSize=200').then(r => r.data?.data || [])
    ])

    const offline = (offlineOrders.status === 'fulfilled' ? offlineOrders.value : [])
      .map(o => ({ ...o, _offline: true, key: `offline_${o.id}` }))

    // Server-IDs die al offline gesynchroniseerd zijn
    const syncedServerIds = new Set(
      offline.filter(o => o.serverId).map(o => o.serverId)
    )

    const online = (serverOrders.status === 'fulfilled' ? serverOrders.value : [])
      .filter(o => !syncedServerIds.has(o.id))
      .map(o => ({ ...o, _offline: false, key: `server_${o.id}` }))

    rows.value = [...offline, ...online].sort((a, b) => {
      const da = new Date(a.orderDate || a.createdAt)
      const db = new Date(b.orderDate || b.createdAt)
      return db - da
    })
  } finally {
    loading.value = false
  }
}

const filteredRows = computed(() => {
  if (!filterStatus.value) return rows.value
  return rows.value.filter(r => r.status === filterStatus.value)
})

// ── Status helpers ────────────────────────────────────────────────────────────
function statusLabel(s) {
  const map = {
    'draft':          t('orders.statusDraft'),
    'confirmed':      t('orders.statusConfirmed'),
    'SentToErp':      t('orders.statusSentToErp'),
    'Confirmed':      t('orders.statusConfirmed'),
    'ProcessedByErp': t('orders.statusProcessed'),
    'Draft':          t('orders.statusDraft'),
    'synced':         t('orders.statusSynced'),
  }
  return map[s] || s
}

function statusSeverity(s) {
  const map = {
    'draft':          'secondary',
    'Draft':          'secondary',
    'confirmed':      'info',
    'Confirmed':      'info',
    'synced':         'info',
    'SentToErp':      'warn',
    'ProcessedByErp': 'success',
  }
  return map[s] || 'secondary'
}

// ── Format helpers ────────────────────────────────────────────────────────────
function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('nl-NL', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  })
}

function formatPrice(v) {
  return (v || 0).toFixed(2).replace('.', ',')
}

function calcTotal(lines) {
  return lines.reduce((sum, l) => {
    const gross = l.quantity * l.unitPrice
    return sum + gross - (gross * (l.discount || 0) / 100)
  }, 0)
}

// ── Acties ────────────────────────────────────────────────────────────────────
function openOrder(row) {
  if (row._offline) return  // voor nu geen detail voor offline orders
  router.push(`/orders/${row.id}`)
}

function editOfflineOrder(row) {
  router.push(`/clients/${row.clientId}/order/new?editId=${row.id}`)
}

function confirmDelete(row) {
  toDeleteOrder.value    = row
  showDeleteDialog.value = true
}

async function doDelete() {
  if (!toDeleteOrder.value) return
  await deleteOrder(toDeleteOrder.value.id)
  showDeleteDialog.value = false
  toDeleteOrder.value    = null
  await loadAll()
  toast.add({ severity: 'info', summary: t('orders.deleted'), life: 3000 })
}

async function handleSync() {
  if (!isOnline.value) {
    toast.add({ severity: 'warn', summary: t('sync.offlineWarning'), life: 3000 })
    return
  }
  syncing.value = true
  try {
    await syncPendingOrders()
    await loadAll()
  } finally {
    syncing.value = false
  }
}
</script>

<style scoped>
.page { padding: 24px; max-width: 1200px; margin: 0 auto; }

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.page-header h1 { margin: 0; font-size: 22px; color: #1a2e1a; }

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

.card {
  background: white;
  border-radius: 12px;
  padding: 16px 20px;
  box-shadow: 0 1px 4px rgba(0,0,0,.06);
  margin-bottom: 16px;
}

.filters { display: flex; gap: 12px; align-items: center; }
.filter-select { width: 200px; }

.loading-state {
  text-align: center;
  padding: 40px;
  color: #888;
}

.empty-state {
  text-align: center;
  padding: 48px 24px;
  color: #aaa;
}
.empty-state i { font-size: 36px; margin-bottom: 12px; display: block; }
.empty-state p { margin: 0; font-size: 15px; }

.table-card { padding: 0; overflow: hidden; }

.orders-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.orders-table th {
  background: #f8faf8;
  padding: 12px 16px;
  text-align: left;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .5px;
  color: #666;
  border-bottom: 1px solid #eee;
}

.orders-table td {
  padding: 12px 16px;
  border-bottom: 1px solid #f5f5f5;
  vertical-align: middle;
}

.order-row {
  cursor: pointer;
  transition: background .15s;
}
.order-row:hover { background: #f8faf8; }
.order-row:last-child td { border-bottom: none; }

.td-client { font-weight: 500; color: #1a2e1a; }
.td-date   { color: #666; white-space: nowrap; }
.td-total  { font-weight: 600; color: #2d6a4f; white-space: nowrap; }

.td-source { white-space: nowrap; }

.offline-badge, .online-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 10px;
}

.offline-badge {
  background: #fff3e0;
  color: #e65100;
}

.online-badge {
  background: #e8f5e9;
  color: #2e7d32;
}

.td-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  justify-content: flex-end;
}

.row-arrow {
  color: #ccc;
  font-size: 12px;
  margin-left: 4px;
}
</style>
