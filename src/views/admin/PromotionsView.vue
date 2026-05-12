<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1>{{ t('promotions.title') }}</h1>
        <p class="subtitle">{{ t('promotions.subtitle') }}</p>
      </div>
      <Button :label="t('promotions.newPromotion')" icon="pi pi-plus" @click="openCreate" />
    </div>

    <!-- List -->
    <div v-if="loading" class="loading-state">
      <i class="pi pi-spin pi-spinner" /> {{ t('common.loading') }}
    </div>

    <div v-else-if="promotions.length === 0" class="empty-state">
      <i class="pi pi-tag" />
      <p>{{ t('promotions.noPromotions') }}</p>
    </div>

    <div v-else class="promo-list">
      <div
        v-for="p in promotions"
        :key="p.id"
        class="promo-card"
        :class="{ active: p.isActive, expired: !p.isActive && isExpired(p.endDate), upcoming: !p.isActive && isUpcoming(p.startDate) }"
      >
        <div class="promo-status-bar" />
        <div class="promo-body">
          <div class="promo-top">
            <div class="promo-info">
              <span class="promo-product">{{ p.productName ?? p.productId }}</span>
              <Tag
                :value="p.isActive ? t('promotions.statusActive') : isExpired(p.endDate) ? t('promotions.statusExpired') : t('promotions.statusPlanned')"
                :severity="p.isActive ? 'success' : isExpired(p.endDate) ? 'secondary' : 'info'"
                class="promo-tag"
              />
            </div>
            <div class="promo-actions">
              <Button icon="pi pi-pencil" text size="small" @click="openEdit(p)" v-tooltip="t('common.edit')" />
              <Button icon="pi pi-trash" text size="small" severity="danger" @click="confirmDelete(p)" v-tooltip="t('common.delete')" />
            </div>
          </div>
          <p class="promo-text">{{ p.promotionText }}</p>
          <div class="promo-dates">
            <i class="pi pi-calendar" />
            <span>{{ formatDate(p.startDate) }} — {{ formatDate(p.endDate) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Create / Edit dialog -->
    <Dialog
      v-model:visible="showForm"
      :header="editId ? t('promotions.editTitle') : t('promotions.newTitle')"
      :style="{ width: '480px' }"
      modal
      @hide="resetForm"
    >
      <div class="form">
        <div class="field">
          <label>{{ t('promotions.product') }} <span class="req">*</span></label>
          <Select
            v-model="form.productId"
            :options="products"
            option-label="name"
            option-value="id"
            :placeholder="t('promotions.chooseProduct')"
            filter
            :loading="loadingProducts"
            class="w-full"
          />
        </div>

        <div class="field">
          <label>{{ t('promotions.promotionText') }} <span class="req">*</span></label>
          <Textarea
            v-model="form.promotionText"
            rows="3"
            :placeholder="t('promotions.promotionTextPlaceholder')"
            class="w-full"
            auto-resize
          />
        </div>

        <div class="field-row">
          <div class="field">
            <label>{{ t('promotions.startDate') }} <span class="req">*</span></label>
            <DatePicker
              v-model="form.startDate"
              date-format="dd-mm-yy"
              :placeholder="t('promotions.chooseDate')"
              class="w-full"
            />
          </div>
          <div class="field">
            <label>{{ t('promotions.endDate') }} <span class="req">*</span></label>
            <DatePicker
              v-model="form.endDate"
              date-format="dd-mm-yy"
              :placeholder="t('promotions.chooseDate')"
              :min-date="form.startDate ?? undefined"
              class="w-full"
            />
          </div>
        </div>
      </div>

      <template #footer>
        <Button :label="t('common.cancel')" severity="secondary" text @click="showForm = false" />
        <Button
          :label="editId ? t('common.save') : t('common.create')"
          :loading="saving"
          :disabled="!isValid"
          @click="submit"
        />
      </template>
    </Dialog>

    <!-- Delete confirm -->
    <Dialog v-model:visible="showDeleteConfirm" :header="t('promotions.deleteTitle')" :style="{ width: '380px' }" modal>
      <p style="margin: 0; font-size: 14px;">
        {{ t('promotions.deleteConfirm') }} <strong>{{ deleteTarget?.productName }}</strong> {{ t('promotions.deleteConfirmEnd') }}
      </p>
      <template #footer>
        <Button :label="t('common.cancel')" severity="secondary" text @click="showDeleteConfirm = false" />
        <Button :label="t('common.delete')" severity="danger" :loading="deleting" @click="doDelete" />
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useI18n } from 'vue-i18n'
import { format, parseISO } from 'date-fns'
import { nl, enGB, es, ca } from 'date-fns/locale'
import api from '../../api/axios'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Dialog from 'primevue/dialog'
import Select from 'primevue/select'
import Textarea from 'primevue/textarea'
import DatePicker from 'primevue/datepicker'

const { t, locale } = useI18n()
const toast = useToast()

const DFNS_LOCALES = { nl, en: enGB, es, ca }
const dateFnsLocale = computed(() => DFNS_LOCALES[locale.value] ?? nl)

const promotions = ref([])
const products = ref([])
const loading = ref(false)
const loadingProducts = ref(false)
const saving = ref(false)
const deleting = ref(false)
const showForm = ref(false)
const showDeleteConfirm = ref(false)
const editId = ref(null)
const deleteTarget = ref(null)

const form = reactive({
  productId: null,
  promotionText: '',
  startDate: null,
  endDate: null
})

const isValid = computed(() =>
  form.productId && form.promotionText.trim().length > 0 && form.startDate && form.endDate
)

function formatDate(d) { return format(parseISO(d), 'd MMM yyyy', { locale: dateFnsLocale.value }) }
function isExpired(d) { return new Date(d) < new Date() }
function isUpcoming(d) { return new Date(d) > new Date() }

async function load() {
  loading.value = true
  try {
    const { data } = await api.get('/promotions')
    promotions.value = data.data
  } catch {
    promotions.value = []
  } finally {
    loading.value = false
  }
}

async function loadProducts() {
  loadingProducts.value = true
  try {
    const { data } = await api.get('/products', { params: { pageSize: 500, activeOnly: true } })
    products.value = data.data ?? []
  } catch {
    products.value = []
  } finally {
    loadingProducts.value = false
  }
}

function resetForm() {
  editId.value = null
  form.productId = null
  form.promotionText = ''
  form.startDate = null
  form.endDate = null
}

function openCreate() {
  resetForm()
  showForm.value = true
}

function openEdit(p) {
  editId.value = p.id
  form.productId = p.productId
  form.promotionText = p.promotionText
  form.startDate = new Date(p.startDate)
  form.endDate = new Date(p.endDate)
  showForm.value = true
}

function confirmDelete(p) {
  deleteTarget.value = p
  showDeleteConfirm.value = true
}

async function submit() {
  saving.value = true
  try {
    const payload = {
      productId: form.productId,
      promotionText: form.promotionText,
      startDate: form.startDate.toISOString(),
      endDate: form.endDate.toISOString()
    }
    if (editId.value) {
      await api.patch(`/promotions/${editId.value}`, payload)
      toast.add({ severity: 'success', summary: t('promotions.updatedSuccess'), life: 3000 })
    } else {
      await api.post('/promotions', payload)
      toast.add({ severity: 'success', summary: t('promotions.createdSuccess'), life: 3000 })
    }
    showForm.value = false
    await load()
  } catch (e) {
    toast.add({ severity: 'error', summary: t('common.error'), detail: e.response?.data?.message ?? t('promotions.saveFailed'), life: 4000 })
  } finally {
    saving.value = false
  }
}

async function doDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await api.delete(`/promotions/${deleteTarget.value.id}`)
    toast.add({ severity: 'success', summary: t('promotions.deleted'), life: 3000 })
    showDeleteConfirm.value = false
    deleteTarget.value = null
    await load()
  } catch {
    toast.add({ severity: 'error', summary: t('promotions.deleteFailed'), life: 3000 })
  } finally {
    deleting.value = false
  }
}

onMounted(() => { load(); loadProducts() })
</script>

<style scoped>
.page {
  padding: 32px;
  max-width: 1000px;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
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
  margin: 0;
  font-size: 14px;
}

.loading-state, .empty-state {
  background: white;
  border-radius: 12px;
  padding: 64px;
  text-align: center;
  color: #adb5bd;
  box-shadow: 0 1px 3px rgba(0,0,0,.07);
}

.empty-state i, .loading-state i {
  font-size: 40px;
  display: block;
  margin-bottom: 12px;
}

.empty-state p { margin: 0; font-size: 14px; }

/* ── Promo cards ──────────────────────────────────────────────────────────── */
.promo-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.promo-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,.07);
  display: flex;
  overflow: hidden;
}

.promo-status-bar {
  width: 4px;
  background: #dee2e6;
  flex-shrink: 0;
}

.promo-card.active .promo-status-bar { background: #40c057; }
.promo-card.expired .promo-status-bar { background: #dee2e6; }
.promo-card.upcoming .promo-status-bar { background: #339af0; }

.promo-body {
  padding: 16px 20px;
  flex: 1;
}

.promo-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 8px;
  gap: 12px;
}

.promo-info {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.promo-product {
  font-size: 15px;
  font-weight: 600;
  color: #212529;
}

.promo-tag {
  font-size: 11px !important;
}

.promo-actions {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
}

.promo-text {
  font-size: 14px;
  color: #495057;
  margin: 0 0 10px;
  line-height: 1.5;
}

.promo-dates {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #868e96;
}

.promo-dates .pi { font-size: 11px; }

/* ── Form ─────────────────────────────────────────────────────────────────── */
.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 0;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field label {
  font-size: 13px;
  font-weight: 500;
  color: #495057;
}

.req { color: #e03131; }
.w-full { width: 100%; }

.field :deep(.p-select),
.field :deep(.p-datepicker),
.field :deep(.p-textarea) {
  width: 100%;
}

.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
</style>
