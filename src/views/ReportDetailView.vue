<template>
  <div class="page">
    <div class="page-header">
      <button class="back-btn" @click="router.back()">
        <i class="pi pi-arrow-left" />
      </button>
      <div v-if="report">
        <h1>{{ t('reportDetail.title') }} — {{ formatDate(report.visitDate) }}</h1>
        <div class="header-meta">
          <span class="client-name">{{ report.clientName }}</span>
          <Tag :value="statusLabel(report.status)" :severity="statusSeverity(report.status)" />
        </div>
      </div>
      <div v-else-if="loading"><div class="skeleton-title" /></div>
    </div>

    <div v-if="error" class="error-msg">
      <Message severity="error" :closable="false">{{ error }}</Message>
    </div>

    <div v-if="report" class="report-grid">
      <!-- ── Left: Transcript & Summary ─────────────────────────────────────── -->
      <div class="left-col">

        <!-- AI Summary -->
        <div class="card" v-if="report.aiSummary">
          <div class="card-header">
            <i class="pi pi-sparkles" />
            <h3>{{ t('reportDetail.aiSummary') }}</h3>
            <Button
              v-if="!isAdmin && !editingSummary"
              icon="pi pi-pencil"
              text
              size="small"
              class="edit-summary-btn"
              @click="startEditSummary"
            />
          </div>
          <div v-if="editingSummary">
            <Textarea
              v-model="summaryDraft"
              rows="10"
              auto-resize
              class="summary-edit"
            />
            <div class="summary-edit-actions">
              <Button :label="t('common.cancel')" severity="secondary" text size="small" @click="cancelEditSummary" />
              <Button :label="t('reportDetail.saveSummary')" icon="pi pi-check" size="small" :loading="savingSummary" @click="saveSummary" />
            </div>
          </div>
          <p v-else class="summary-text">{{ report.aiSummary }}</p>
        </div>

        <!-- Transcript (SalesRep only) -->
        <div class="card" v-if="!isAdmin && report.transcriptText">
          <div class="card-header">
            <i class="pi pi-align-left" />
            <h3>{{ t('reportDetail.transcript') }}</h3>
          </div>
          <p class="transcript-text">{{ report.transcriptText }}</p>
        </div>

        <!-- Processing state (SalesRep only) -->
        <div class="card processing-card" v-if="!isAdmin && report.status === 'Transcribing'">
          <i class="pi pi-spin pi-spinner" />
          <p>{{ t('reportDetail.transcribing') }}</p>
        </div>

        <!-- Error state (SalesRep only) -->
        <div class="card error-card" v-if="!isAdmin && report.status === 'Error'">
          <i class="pi pi-exclamation-triangle" />
          <p>{{ t('reportDetail.transcribeFailed') }}</p>
        </div>

        <!-- Upload audio (SalesRep only, if not yet transcribed) -->
        <div class="card" v-if="!isAdmin && !report.transcriptText">
          <div class="card-header">
            <i class="pi pi-microphone" />
            <h3>{{ t('reportDetail.uploadAudio') }}</h3>
          </div>
          <div class="audio-drop">
            <input ref="fileInput" type="file" accept="audio/*,.m4a,.mp3,.wav,.ogg,.webm"
              class="hidden-input" @change="onFileChange" />
            <Button
              v-if="!audioFile"
              icon="pi pi-upload"
              :label="t('reportDetail.chooseAudio')"
              severity="secondary"
              outlined
              @click="fileInput.click()"
            />
            <div v-else class="audio-file-selected">
              <i class="pi pi-file-audio" />
              <span>{{ audioFile.name }}</span>
            </div>
          </div>
          <Button
            v-if="audioFile"
            :label="t('reportDetail.uploadTranscribe')"
            icon="pi pi-microphone"
            :loading="uploading"
            @click="uploadAudio"
            class="upload-btn"
          />
        </div>
      </div>

      <!-- ── Right: Order lines ─────────────────────────────────────────────── -->
      <div class="right-col">
        <div class="card">
          <div class="card-header">
            <i class="pi pi-shopping-cart" />
            <h3>{{ t('reportDetail.discussedProducts') }}</h3>
          </div>

          <!-- Extract from summary button -->
          <Button
            v-if="report.aiSummary && lines.length === 0 && !extracting"
            :label="t('reportDetail.extractFromSummary')"
            icon="pi pi-sparkles"
            severity="secondary"
            outlined
            class="extract-btn"
            @click="extractOrders"
          />

          <!-- Extracting state -->
          <div v-if="extracting" class="extracting-state">
            <i class="pi pi-spin pi-spinner" />
            <span>{{ t('reportDetail.extracting') }}</span>
          </div>

          <!-- No summary available -->
          <div v-if="!report.aiSummary && lines.length === 0" class="empty-lines">
            {{ t('reportDetail.noSummaryYet') }}
          </div>

          <div v-if="lines.length === 0 && !extracting && report.aiSummary" class="empty-hint">
            {{ t('reportDetail.extractHint') }}
          </div>

          <div v-for="(line, i) in lines" :key="i" class="order-line">
            <div class="line-fields">
              <div class="line-raw">
                <span class="raw-label">{{ line.productNameRaw }}</span>
                <span class="raw-qty">{{ line.quantity }} {{ line.unit }}</span>
              </div>
              <Select
                v-model="line.productId"
                :options="products"
                option-label="name"
                option-value="id"
                :placeholder="t('reportDetail.linkProduct')"
                filter
                show-clear
                class="line-product-select"
              />
            </div>
            <Button icon="pi pi-trash" text severity="danger" size="small" @click="removeLine(i)" />
          </div>

          <Button
            v-if="lines.length > 0"
            :label="t('common.save')"
            :loading="savingLines"
            @click="saveLines"
            class="save-lines-btn"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import { format, parseISO } from 'date-fns'
import { nl, enGB, es, ca } from 'date-fns/locale'
import api from '../api/axios'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import Message from 'primevue/message'
import Select from 'primevue/select'
import Textarea from 'primevue/textarea'

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const toast = useToast()
const { isAdmin } = useAuthStore()

const DFNS_LOCALES = { nl, en: enGB, es, ca }
const dateFnsLocale = computed(() => DFNS_LOCALES[locale.value] ?? nl)

const report = ref(null)
const loading = ref(true)
const error = ref('')
const uploading = ref(false)
const savingLines = ref(false)
const savingSummary = ref(false)
const editingSummary = ref(false)
const summaryDraft = ref('')
const extracting = ref(false)
const audioFile = ref(null)
const fileInput = ref(null)
const lines = ref([])
const products = ref([])

const STATUS_SEVERITY = { Uploaded: 'secondary', Transcribing: 'info', Summarized: 'success', Error: 'danger' }

function statusLabel(s) {
  const keys = { Uploaded: 'reportStatus.uploaded', Transcribing: 'reportStatus.transcribing', Summarized: 'reportStatus.summarized', Error: 'reportStatus.error' }
  return keys[s] ? t(keys[s]) : s
}
function statusSeverity(s) { return STATUS_SEVERITY[s] ?? 'secondary' }
function formatDate(d) { return format(parseISO(d), 'd MMMM yyyy', { locale: dateFnsLocale.value }) }

async function load() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.get(`/reports/${route.params.id}`)
    report.value = data.data
    lines.value = (data.data.orderLines ?? []).map(l => ({
      productNameRaw: l.productNameRaw,
      quantity: l.quantity,
      unit: l.unit,
      productId: l.productId,
      notes: l.notes
    }))
  } catch (e) {
    error.value = e.response?.status === 404 ? t('reportDetail.notFound') : t('reportDetail.loadFailed')
  } finally {
    loading.value = false
  }
}

async function loadProducts() {
  try {
    const { data } = await api.get('/products', { params: { pageSize: 500, activeOnly: true } })
    products.value = data.data ?? []
  } catch {
    products.value = []
  }
}

function onFileChange(e) {
  audioFile.value = e.target.files[0] ?? null
}

async function uploadAudio() {
  if (!audioFile.value) return
  uploading.value = true
  try {
    const fd = new FormData()
    fd.append('audio', audioFile.value)
    fd.append('language', locale.value)
    await api.post(`/reports/${route.params.id}/audio`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    toast.add({ severity: 'info', summary: t('reportDetail.uploaded'), detail: t('reportDetail.transcriptionStarted'), life: 4000 })
    audioFile.value = null
    await load()
  } catch {
    toast.add({ severity: 'error', summary: t('reportDetail.uploadFailed'), life: 3000 })
  } finally {
    uploading.value = false
  }
}

async function extractOrders() {
  extracting.value = true
  try {
    const { data } = await api.post(`/reports/${route.params.id}/extract-orders`, null, { params: { language: locale.value } })
    const extracted = data.data ?? []
    if (extracted.length === 0) {
      toast.add({ severity: 'info', summary: t('reportDetail.noOrdersFound'), life: 3000 })
    } else {
      lines.value = extracted.map(item => ({
        productNameRaw: item.productNameRaw,
        quantity: item.quantity,
        unit: item.unit,
        productId: null,
        notes: null
      }))
    }
  } catch {
    toast.add({ severity: 'error', summary: t('reportDetail.extractFailed'), life: 3000 })
  } finally {
    extracting.value = false
  }
}

function removeLine(i) {
  lines.value.splice(i, 1)
}

async function saveLines() {
  savingLines.value = true
  try {
    await api.patch(`/reports/${route.params.id}`, { orderLines: lines.value })
    toast.add({ severity: 'success', summary: t('reportDetail.savedSuccess'), life: 3000 })
    await load()
  } catch {
    toast.add({ severity: 'error', summary: t('reportDetail.saveFailed'), life: 3000 })
  } finally {
    savingLines.value = false
  }
}

function startEditSummary() {
  summaryDraft.value = report.value.aiSummary
  editingSummary.value = true
}

function cancelEditSummary() {
  editingSummary.value = false
  summaryDraft.value = ''
}

async function saveSummary() {
  savingSummary.value = true
  try {
    await api.patch(`/reports/${route.params.id}`, { aiSummary: summaryDraft.value })
    report.value.aiSummary = summaryDraft.value
    editingSummary.value = false
    toast.add({ severity: 'success', summary: t('reportDetail.savedSuccess'), life: 3000 })
  } catch {
    toast.add({ severity: 'error', summary: t('reportDetail.saveFailed'), life: 3000 })
  } finally {
    savingSummary.value = false
  }
}

onMounted(() => { load(); loadProducts() })
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
  margin-bottom: 28px;
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
.back-btn:hover { background: #f1f5f2; }

.page-header h1 {
  font-size: 20px;
  font-weight: 700;
  color: #1b4332;
  margin: 0 0 6px;
}

.header-meta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.client-name {
  font-size: 14px;
  color: #495057;
  font-weight: 500;
}

.skeleton-title {
  height: 28px;
  width: 240px;
  background: #e9ecef;
  border-radius: 6px;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.report-grid {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 20px;
  align-items: start;
}

@media (max-width: 1000px) {
  .report-grid { grid-template-columns: 1fr; }
}

.card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.07);
  margin-bottom: 16px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
}

.card-header h3 {
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #6c757d;
  margin: 0;
  flex: 1;
}

.card-header .pi {
  color: #2d6a4f;
  font-size: 15px;
}

.edit-summary-btn {
  margin-left: auto;
  opacity: 0.5;
  transition: opacity 0.15s;
}
.edit-summary-btn:hover { opacity: 1; }

.summary-edit {
  width: 100%;
  font-size: 14px;
  line-height: 1.7;
  margin-bottom: 10px;
}

.summary-edit-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.summary-text {
  font-size: 14px;
  line-height: 1.7;
  color: #212529;
  margin: 0;
  white-space: pre-wrap;
}

.transcript-text {
  font-size: 13px;
  line-height: 1.7;
  color: #495057;
  margin: 0;
  background: #f8f9fa;
  border-radius: 8px;
  padding: 12px;
  white-space: pre-wrap;
  max-height: 300px;
  overflow-y: auto;
}

.processing-card {
  text-align: center;
  color: #339af0;
}

.processing-card .pi {
  font-size: 32px;
  display: block;
  margin-bottom: 12px;
}

.processing-card p { margin: 0; font-size: 14px; }

.error-card {
  text-align: center;
  color: #fa5252;
}

.error-card .pi {
  font-size: 32px;
  display: block;
  margin-bottom: 12px;
}

.error-card p { margin: 0; font-size: 14px; }

.audio-drop {
  display: flex;
  margin-bottom: 12px;
}

.hidden-input { display: none; }

.audio-file-selected {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #e7f5ff;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 13px;
  color: #1c7ed6;
}

.upload-btn {
  width: 100%;
}

/* ── Order lines ─────────────────────────────────────────────────────────── */
.extract-btn {
  width: 100%;
  margin-bottom: 12px;
}

.extracting-state {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 0;
  font-size: 13px;
  color: #6c757d;
}

.empty-lines {
  font-size: 13px;
  color: #adb5bd;
  text-align: center;
  padding: 16px;
}

.empty-hint {
  font-size: 12px;
  color: #ced4da;
  text-align: center;
  padding: 8px 0 4px;
}

.order-line {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid #f1f3f5;
}

.order-line:last-of-type {
  border-bottom: none;
}

.line-fields {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}

.line-raw {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.raw-label {
  font-size: 13px;
  font-weight: 600;
  color: #212529;
}

.raw-qty {
  font-size: 12px;
  color: #6c757d;
}

.line-product-select {
  width: 100%;
}

.save-lines-btn {
  width: 100%;
  margin-top: 8px;
  background: #2d6a4f !important;
  border-color: #2d6a4f !important;
}
</style>
