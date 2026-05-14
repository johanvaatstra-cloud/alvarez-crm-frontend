<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1>{{ t('clients.title') }}</h1>
        <p class="subtitle">{{ pagination.total }} {{ t('clients.found') }}</p>
      </div>
    </div>

    <div class="toolbar">
      <IconField class="search-field">
        <InputIcon class="pi pi-search" />
        <InputText
          v-model="search"
          :placeholder="t('clients.searchPlaceholder')"
          @input="onSearch"
        />
      </IconField>
    </div>

    <div class="card">
      <DataTable
        :value="clients"
        :loading="loading"
        lazy
        paginator
        :rows="pagination.pageSize"
        :total-records="pagination.total"
        @page="onPage"
        row-hover
        @row-click="onRowClick"
        :pt="{ row: { class: 'cursor-pointer' } }"
      >
        <Column field="companyName" :header="t('clients.companyName')" />
        <Column field="contactName" :header="t('clients.contactPerson')" />
        <Column field="email" :header="t('common.email')" />
        <Column field="phone" :header="t('common.phone')">
          <template #body="{ data }">{{ data.phone || '—' }}</template>
        </Column>
        <Column field="crmClientType" :header="t('common.type')">
          <template #body="{ data }">
            <Tag :value="typeLabel(data.crmClientType)" :severity="typeSeverity(data.crmClientType)" />
          </template>
        </Column>
        <Column v-if="auth.isAdmin" field="salesRepName" :header="t('clients.salesRep')">
          <template #body="{ data }">{{ data.salesRepName || '—' }}</template>
        </Column>
        <Column field="isActive" :header="t('common.status')">
          <template #body="{ data }">
            <Tag :value="data.isActive ? t('common.active') : t('common.inactive')" :severity="data.isActive ? 'success' : 'secondary'" />
          </template>
        </Column>
        <template #empty>
          <div class="empty-state">
            <i class="pi pi-building" />
            <p>{{ t('clients.noClients') }}</p>
          </div>
        </template>
      </DataTable>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import api from '../api/axios'
import { cacheClients } from '../services/offlineClientCache.js'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import Tag from 'primevue/tag'

const { t } = useI18n()
const router = useRouter()
const auth = useAuthStore()

const clients = ref([])
const loading = ref(false)
const search = ref('')
const pagination = reactive({ page: 1, pageSize: 20, total: 0 })

let searchTimer = null

const TYPE_SEVERITY = { Restaurant: 'info', Hotel: 'warn', Catering: 'success', Other: 'secondary' }

function typeLabel(type) {
  const map = {
    Restaurant: t('clients.typeRestaurant'),
    Hotel: t('clients.typeHotel'),
    Catering: t('clients.typeCatering'),
    Other: t('clients.typeOther')
  }
  return map[type] ?? type
}
function typeSeverity(type) { return TYPE_SEVERITY[type] ?? 'secondary' }

async function load() {
  loading.value = true
  try {
    const endpoint = auth.isAdmin ? '/admin/clients' : '/clients'
    const { data } = await api.get(endpoint, {
      params: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        search: search.value || undefined
      }
    })
    clients.value = data.data
    pagination.total = data.pagination?.totalCount ?? 0
    cacheClients(data.data)   // cache voor offline gebruik
  } finally {
    loading.value = false
  }
}

function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    pagination.page = 1
    load()
  }, 300)
}

function onPage(e) {
  pagination.page = e.page + 1
  load()
}

function onRowClick(e) {
  router.push(`/clients/${e.data.id}`)
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
  font-size: 14px;
  margin: 0;
}

.toolbar {
  margin-bottom: 16px;
}

.search-field {
  width: 100%;
  max-width: 400px;
}

.search-field :deep(.p-inputtext) {
  width: 100%;
  background: var(--input-bg) !important;
  border-color: var(--input-border) !important;
  color: var(--text) !important;
}

.card {
  background: var(--card);
  border-radius: 14px;
  border-top: 1px solid var(--card-top);
  border-left: 1px solid var(--card-left);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

.card :deep(.p-datatable-header) {
  background: transparent;
  border: none;
}

.card :deep(.p-datatable-thead > tr > th) {
  background: var(--th-bg);
  color: var(--text-2);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-color: var(--divider);
}

.card :deep(.p-datatable-tbody > tr > td) {
  border-color: var(--row-border);
  color: var(--text);
}

.card :deep(.p-datatable-tbody > tr) {
  cursor: pointer;
  background: transparent;
}

.card :deep(.p-datatable-tbody > tr:hover > td) {
  background: var(--row-hover);
}

.card :deep(.p-paginator) {
  background: transparent;
  border-color: var(--divider);
  color: var(--text-2);
}

.empty-state {
  text-align: center;
  padding: 48px;
  color: var(--text-3);
}

.empty-state i {
  font-size: 32px;
  display: block;
  margin-bottom: 8px;
}

.empty-state p {
  margin: 0;
  font-size: 14px;
}

.cursor-pointer {
  cursor: pointer;
}
</style>
