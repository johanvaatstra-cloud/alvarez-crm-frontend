<template>
  <div class="page" :class="isDark ? 'theme-dark' : 'theme-light'">

    <!-- Blob achtergronden -->
    <div class="blobs" aria-hidden="true">
      <div class="blob blob-1" />
      <div class="blob blob-2" />
      <div class="blob blob-3" />
      <div class="blob blob-4" />
    </div>

    <div class="page-header">
      <h1>{{ t('products.title') }}</h1>
      <p class="subtitle">{{ pagination.totalCount ?? '…' }} {{ t('products.inCatalog') }}</p>
    </div>

    <!-- Filters -->
    <div class="glass-card filters-card">
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

    <!-- Tabel -->
    <div class="glass-card table-wrap">
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
              <span :class="['status-badge', p.isActive ? 'badge-active' : 'badge-inactive']">
                {{ p.isActive ? t('common.active') : t('common.inactive') }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="empty-state">
        <i class="pi pi-box" />
        <p>{{ t('products.noProducts') }}</p>
      </div>
    </div>

    <!-- Paginering -->
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
import { useTheme } from '../../composables/useTheme.js'
import api from '../../api/axios'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import Select from 'primevue/select'
import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'

const { t } = useI18n()
const { isDark } = useTheme()

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
/* ── Thema variabelen ─────────────────────────────────────────────────────── */
.theme-dark {
  --bg:         #0f1923;
  --card:       rgba(255,255,255,0.07);
  --card-top:   rgba(255,255,255,0.22);
  --card-left:  rgba(255,255,255,0.10);
  --border:     rgba(255,255,255,0.06);
  --text:       rgba(255,255,255,0.92);
  --muted:      rgba(255,255,255,0.45);
  --accent:     #4ade80;
  --accent-dim: rgba(74,222,128,0.15);
  --th-bg:      rgba(255,255,255,0.04);
  --row-hover:  rgba(255,255,255,0.05);
  --shadow:     0 8px 32px rgba(0,0,0,0.45);
  background:   #0f1923;
  color:        rgba(255,255,255,0.92);
}

.theme-light {
  --bg:         transparent;
  --card:       rgba(255,255,255,0.68);
  --card-top:   rgba(255,255,255,0.97);
  --card-left:  rgba(255,255,255,0.85);
  --border:     rgba(0,0,0,0.05);
  --text:       #1a2e1a;
  --muted:      #6c757d;
  --accent:     #2d6a4f;
  --accent-dim: rgba(45,106,79,0.10);
  --th-bg:      rgba(248,250,248,0.90);
  --row-hover:  rgba(45,106,79,0.04);
  --shadow:     0 2px 16px rgba(0,0,0,0.07);
  background:   linear-gradient(135deg, #e8f5ee 0%, #f0f4ff 100%);
  background-attachment: fixed;
  color:        #1a2e1a;
}

/* ── Blobs ───────────────────────────────────────────────────────────────── */
.blobs { position: fixed; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }
.blob  { position: absolute; border-radius: 50%; filter: blur(72px); opacity: 0; transition: opacity .4s; }
.theme-dark .blob { opacity: 1; }
.blob-1 { width: 600px; height: 600px; top: -120px; right: -80px;  background: radial-gradient(circle, rgba(74,222,128,0.28) 0%, transparent 68%); }
.blob-2 { width: 520px; height: 520px; bottom: 10%; left: -120px;  background: radial-gradient(circle, rgba(96,165,250,0.22) 0%, transparent 68%); }
.blob-3 { width: 420px; height: 420px; top: 42%;    right: 28%;    background: radial-gradient(circle, rgba(167,139,250,0.20) 0%, transparent 68%); }
.blob-4 { width: 360px; height: 360px; bottom: 8%;  right: 8%;     background: radial-gradient(circle, rgba(34,211,238,0.16) 0%, transparent 68%); }
.page > *:not(.blobs) { position: relative; z-index: 1; }

/* ── Layout ──────────────────────────────────────────────────────────────── */
.page { padding: 32px; max-width: 1200px; min-height: 100vh; }

.page-header { margin-bottom: 20px; }
.page-header h1 { font-size: 24px; font-weight: 700; color: var(--text); margin: 0 0 4px; }
.subtitle { color: var(--muted); margin: 0; font-size: 14px; }

/* ── Glass kaart ─────────────────────────────────────────────────────────── */
.glass-card {
  background: var(--card);
  border-radius: 14px;
  border-top: 1px solid var(--card-top);
  border-left: 1px solid var(--card-left);
  border-right: none;
  border-bottom: none;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: var(--shadow);
}

/* ── Filters ─────────────────────────────────────────────────────────────── */
.filters-card {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
  padding: 14px 16px;
  flex-wrap: wrap;
}

.filters-card :deep(.p-inputtext) { width: 280px; }

.filter-toggle {
  display: flex;
  align-items: center;
  font-size: 13px;
  color: var(--muted);
  gap: 6px;
}
.filter-toggle label { display: flex; align-items: center; gap: 6px; cursor: pointer; }

/* ── Tabel ───────────────────────────────────────────────────────────────── */
.table-wrap { overflow: hidden; padding: 0; }

.loading-row {
  padding: 48px;
  text-align: center;
  color: var(--muted);
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
  color: var(--muted);
  border-bottom: 1px solid var(--border);
  background: var(--th-bg);
}

.product-table th.right { text-align: right; }

.product-table td {
  padding: 11px 16px;
  border-bottom: 1px solid var(--border);
  color: var(--text);
  vertical-align: middle;
}

.product-table tr:last-child td { border-bottom: none; }
.product-table tr:hover td { background: var(--row-hover); }

.prod-name { font-weight: 500; }
.prod-brand { font-size: 11px; color: var(--muted); margin-top: 1px; }
.sku { font-family: monospace; font-size: 12px; color: var(--muted); }
.right { text-align: right; }
.price { font-variant-numeric: tabular-nums; }

/* ── Status badges ───────────────────────────────────────────────────────── */
.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.3px;
  border: 1px solid transparent;
}

.badge-active   { background: rgba(74,222,128,0.18);  color: var(--accent); border-color: rgba(74,222,128,0.3); }
.badge-inactive { background: rgba(156,163,175,0.15); color: var(--muted);  border-color: rgba(156,163,175,0.25); }

/* ── Empty state ─────────────────────────────────────────────────────────── */
.empty-state {
  text-align: center;
  padding: 64px 32px;
  color: var(--muted);
}
.empty-state i { font-size: 40px; display: block; margin-bottom: 12px; }
.empty-state p { margin: 0; font-size: 14px; }

/* ── Paginering ──────────────────────────────────────────────────────────── */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  margin-top: 16px;
}
.page-info { font-size: 13px; color: var(--muted); padding: 0 8px; }
</style>
