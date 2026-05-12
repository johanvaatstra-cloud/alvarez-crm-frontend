<template>
  <div class="page">
    <div class="page-header">
      <h1>{{ t('products.title') }}</h1>
      <p class="subtitle">{{ pagination.totalCount ?? '…' }} {{ t('products.inCatalog') }}</p>
    </div>

    <!-- Filters -->
    <div class="filters">
      <IconField>
        <InputIcon class="pi pi-search" />
        <InputText v-model="search" :placeholder="t('products.searchPlaceholder')" @input="onSearch" />
      </IconField>
      <Select
        v-model="selectedCategory"
        :options="[{ id: null, name: t('products.allCategories') }, ...categories]"
        option-label="name"
        option-value="id"
        :placeholder="t('products.category')"
        style="width:200px"
        @change="load(1)"
      />
      <div class="filter-toggle">
        <label>
          <input type="checkbox" v-model="activeOnly" @change="load(1)" />
          {{ t('products.onlyActive') }}
        </label>
      </div>
    </div>

    <!-- Table -->
    <div class="table-card">
      <div v-if="loading" class="loading-row">
        <i class="pi pi-spin pi-spinner" /> {{ t('common.loading') }}
      </div>
      <table v-else-if="products.length > 0" class="product-table">
        <thead>
          <tr>
            <th>{{ t('common.name') }}</th>
            <th>{{ t('products.sku') }}</th>
            <th>{{ t('products.category') }}</th>
            <th>{{ t('products.unit') }}</th>
            <th class="right">{{ t('products.priceKg') }}</th>
            <th class="right">{{ t('products.priceUnit') }}</th>
            <th>{{ t('common.status') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in products" :key="p.id">
            <td>
              <div class="prod-name">{{ p.name }}</div>
              <div v-if="p.brand" class="prod-brand">{{ p.brand }}</div>
            </td>
            <td class="sku">{{ p.sku }}</td>
            <td>{{ p.categoryName ?? '—' }}</td>
            <td>{{ p.unit }}</td>
            <td class="right price">{{ p.pricePerKg != null ? '€ ' + p.pricePerKg.toFixed(2) : '—' }}</td>
            <td class="right price">{{ p.pricePerUnit != null ? '€ ' + p.pricePerUnit.toFixed(2) : '—' }}</td>
            <td>
              <Tag :value="p.isActive ? t('common.active') : t('common.inactive')" :severity="p.isActive ? 'success' : 'secondary'" />
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="empty-state">
        <i class="pi pi-box" />
        <p>{{ t('products.noProducts') }}</p>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="pagination.totalCount > pageSize" class="pagination">
      <Button icon="pi pi-angle-double-left" text size="small" :disabled="page === 1" @click="load(1)" />
      <Button icon="pi pi-angle-left" text size="small" :disabled="page === 1" @click="load(page - 1)" />
      <span class="page-info">{{ page }} / {{ totalPages }}</span>
      <Button icon="pi pi-angle-right" text size="small" :disabled="page >= totalPages" @click="load(page + 1)" />
      <Button icon="pi pi-angle-double-right" text size="small" :disabled="page >= totalPages" @click="load(totalPages)" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import api from '../../api/axios'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import Select from 'primevue/select'
import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'

const { t } = useI18n()

const products = ref([])
const categories = ref([])
const loading = ref(false)
const search = ref('')
const selectedCategory = ref(null)
const activeOnly = ref(false)
const page = ref(1)
const pageSize = 25
const pagination = ref({})

let searchTimer = null

const totalPages = computed(() => Math.ceil((pagination.value.totalCount ?? 0) / pageSize))

function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => load(1), 300)
}

async function load(p = 1) {
  page.value = p
  loading.value = true
  try {
    const params = { page: p, pageSize }
    if (search.value.trim()) params.search = search.value.trim()
    if (selectedCategory.value) params.categoryId = selectedCategory.value
    if (activeOnly.value) params.activeOnly = true
    const { data } = await api.get('/products', { params })
    products.value = data.data
    pagination.value = data.pagination ?? {}
  } catch {
    products.value = []
  } finally {
    loading.value = false
  }
}

async function loadCategories() {
  try {
    const { data } = await api.get('/categories')
    categories.value = data.data
  } catch {
    categories.value = []
  }
}

onMounted(() => { load(); loadCategories() })
</script>

<style scoped>
.page { padding: 32px; max-width: 1200px; }

.page-header { margin-bottom: 20px; }
.page-header h1 { font-size: 24px; font-weight: 700; color: #1b4332; margin: 0 0 4px; }
.subtitle { color: #6c757d; margin: 0; font-size: 14px; }

.filters {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.filters :deep(.p-inputtext) { width: 280px; }

.filter-toggle {
  display: flex;
  align-items: center;
  font-size: 13px;
  color: #495057;
  gap: 6px;
}
.filter-toggle label { display: flex; align-items: center; gap: 6px; cursor: pointer; }

.table-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,.08);
  overflow: hidden;
}

.loading-row {
  padding: 48px;
  text-align: center;
  color: #6c757d;
  font-size: 14px;
}

.product-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.product-table th {
  padding: 12px 16px;
  text-align: left;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: #6c757d;
  border-bottom: 1px solid #e9ecef;
  background: #f8f9fa;
}

.product-table th.right { text-align: right; }

.product-table td {
  padding: 11px 16px;
  border-bottom: 1px solid #f1f3f5;
  color: #212529;
  vertical-align: middle;
}

.product-table tr:last-child td { border-bottom: none; }
.product-table tr:hover td { background: #f8fff9; }

.prod-name { font-weight: 500; }
.prod-brand { font-size: 11px; color: #868e96; margin-top: 1px; }
.sku { font-family: monospace; font-size: 12px; color: #6c757d; }
.right { text-align: right; }
.price { font-variant-numeric: tabular-nums; }

.empty-state {
  text-align: center;
  padding: 64px 32px;
  color: #adb5bd;
}
.empty-state i { font-size: 40px; display: block; margin-bottom: 12px; }
.empty-state p { margin: 0; font-size: 14px; }

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  margin-top: 16px;
}
.page-info { font-size: 13px; color: #495057; padding: 0 8px; }
</style>
