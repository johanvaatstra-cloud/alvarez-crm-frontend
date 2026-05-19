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
      <div>
        <h1>{{ t('promotions.title') }}</h1>
        <p class="subtitle">{{ t('promotions.subtitle') }}</p>
      </div>
      <button class="btn-new" @click="openCreate">
        <i class="pi pi-plus" />
        {{ t('promotions.newPromotion') }}
      </button>
    </div>

    <!-- Laden -->
    <div v-if="loading" class="glass-card empty-card">
      <i class="pi pi-spin pi-spinner" />
      <p>{{ t('common.loading') }}</p>
    </div>

    <!-- Leeg -->
    <div v-else-if="promotions.length === 0" class="glass-card empty-card">
      <i class="pi pi-tag" />
      <p>{{ t('promotions.noPromotions') }}</p>
    </div>

    <!-- Promotie kaarten -->
    <div v-else class="promo-list">
      <div
        v-for="p in promotions"
        :key="p.id"
        class="glass-card promo-card"
        :class="{ active: p.isActive, expired: !p.isActive && isExpired(p.endDate), upcoming: !p.isActive && isUpcoming(p.startDate) }"
      >
        <div class="promo-status-bar" />
        <div class="promo-body">
          <div class="promo-top">
            <div class="promo-info">
              <span class="promo-product">{{ p.productName ?? p.productId }}</span>
              <span :class="['status-badge', promoStatusClass(p)]">
                {{ p.isActive ? t('promotions.statusActive') : isExpired(p.endDate) ? t('promotions.statusExpired') : t('promotions.statusPlanned') }}
              </span>
            </div>
            <div class="promo-actions">
              <button class="icon-btn" @click="openEdit(p)" :title="t('common.edit')">
                <i class="pi pi-pencil" />
              </button>
              <button class="icon-btn icon-btn-danger" @click="confirmDelete(p)" :title="t('common.delete')">
                <i class="pi pi-trash" />
              </button>
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

    <!-- Aanmaken / Bewerken dialoog -->
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

    <!-- Verwijder bevestiging -->
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
import { useTheme } from '../../composables/useTheme.js'
import { format, parseISO } from 'date-fns'
import { nl, enGB, es, ca } from 'date-fns/locale'
import api from '../../api/axios'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Select from 'primevue/select'
import Textarea from 'primevue/textarea'
import DatePicker from 'primevue/datepicker'

const { t, locale } = useI18n()
const toast = useToast()
const { isDark } = useTheme()

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

function promoStatusClass(p) {
  if (p.isActive) return 'badge-active'
  if (isExpired(p.endDate)) return 'badge-expired'
  return 'badge-planned'
}

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
  --btn:        rgba(255,255,255,0.10);
  --btn-hover:  rgba(255,255,255,0.17);
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
  --btn:        rgba(45,106,79,0.08);
  --btn-hover:  rgba(45,106,79,0.14);
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
.page { padding: 32px; max-width: 1000px; min-height: 100vh; }

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 28px;
}

.page-header h1 { font-size: 24px; font-weight: 700; color: var(--text); margin: 0 0 4px; }
.subtitle { color: var(--muted); margin: 0; font-size: 14px; }

/* ── Nieuwe-promotie knop ─────────────────────────────────────────────────── */
.btn-new {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1px solid var(--accent);
  border-radius: 8px;
  background: var(--accent-dim);
  color: var(--accent);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background .15s;
  flex-shrink: 0;
}
.btn-new:hover { background: rgba(74,222,128,0.22); }

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

/* ── Leeg / laden staat ──────────────────────────────────────────────────── */
.empty-card {
  padding: 64px;
  text-align: center;
  color: var(--muted);
}
.empty-card i { font-size: 40px; display: block; margin-bottom: 12px; }
.empty-card p { margin: 0; font-size: 14px; }

/* ── Promotie kaarten ────────────────────────────────────────────────────── */
.promo-list { display: flex; flex-direction: column; gap: 12px; }

.promo-card {
  display: flex;
  overflow: hidden;
  padding: 0;
}

.promo-status-bar {
  width: 4px;
  background: var(--border);
  flex-shrink: 0;
}

.promo-card.active   .promo-status-bar { background: #4ade80; }
.promo-card.expired  .promo-status-bar { background: rgba(156,163,175,0.4); }
.promo-card.upcoming .promo-status-bar { background: #60a5fa; }

.promo-body { padding: 16px 20px; flex: 1; }

.promo-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 8px;
  gap: 12px;
}

.promo-info { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

.promo-product { font-size: 15px; font-weight: 600; color: var(--text); }

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
.badge-active  { background: rgba(74,222,128,0.18);  color: var(--accent); border-color: rgba(74,222,128,0.3); }
.badge-expired { background: rgba(156,163,175,0.15); color: var(--muted);  border-color: rgba(156,163,175,0.25); }
.badge-planned { background: rgba(96,165,250,0.18);  color: #60a5fa;       border-color: rgba(96,165,250,0.3); }

.promo-actions { display: flex; gap: 2px; flex-shrink: 0; }

.icon-btn {
  display: flex; align-items: center; justify-content: center;
  width: 30px; height: 30px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--btn);
  color: var(--muted);
  cursor: pointer;
  font-size: 13px;
  transition: background .15s, color .15s;
}
.icon-btn:hover { background: var(--btn-hover); color: var(--text); }
.icon-btn-danger:hover { background: rgba(248,113,113,0.15); color: #f87171; border-color: rgba(248,113,113,0.3); }

.promo-text {
  font-size: 14px;
  color: var(--muted);
  margin: 0 0 10px;
  line-height: 1.5;
}

.promo-dates {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--muted);
  opacity: 0.75;
}
.promo-dates .pi { font-size: 11px; }

/* ── Formulier ───────────────────────────────────────────────────────────── */
.form { display: flex; flex-direction: column; gap: 16px; padding: 8px 0; }

.field { display: flex; flex-direction: column; gap: 6px; }

.field label { font-size: 13px; font-weight: 500; color: #495057; }

.req { color: #e03131; }
.w-full { width: 100%; }

.field :deep(.p-select),
.field :deep(.p-datepicker),
.field :deep(.p-textarea) { width: 100%; }

.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

@media (max-width: 900px) { .field-row { grid-template-columns: 1fr; } }
</style>
