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
        <h1>{{ t('users.title') }}</h1>
        <p class="subtitle">{{ t('users.subtitle') }}</p>
      </div>
      <Button :label="t('users.addEmployee')" icon="pi pi-plus" @click="openCreateDialog" class="btn-accent" />
    </div>

    <div class="glass-card table-wrap">
      <DataTable :value="users" :loading="loading">
        <Column field="fullName" :header="t('common.name')" />
        <Column field="email" :header="t('common.email')" />
        <Column field="isActive" :header="t('common.status')">
          <template #body="{ data }">
            <span :class="['status-badge', data.isActive ? 'badge-active' : 'badge-inactive']">
              {{ data.isActive ? t('common.active') : t('common.inactive') }}
            </span>
          </template>
        </Column>
        <Column :header="t('common.actions')" style="width: 140px">
          <template #body="{ data }">
            <button
              v-if="data.isActive"
              class="btn-deactivate"
              @click="deactivate(data)"
            >
              {{ t('users.deactivate') }}
            </button>
          </template>
        </Column>
        <template #empty>
          <div class="empty-state">
            <i class="pi pi-users" />
            <p>{{ t('users.noEmployees') }}</p>
          </div>
        </template>
      </DataTable>
    </div>

    <!-- Create user dialog -->
    <Dialog
      v-model:visible="showDialog"
      :header="t('users.addTitle')"
      :style="{ width: '440px' }"
      modal
    >
      <div class="dialog-form">
        <div class="field">
          <label for="fullName">{{ t('users.fullName') }}</label>
          <InputText id="fullName" v-model="form.fullName" :placeholder="t('users.namePlaceholder')" />
        </div>
        <div class="field">
          <label for="email">{{ t('common.email') }}</label>
          <InputText id="email" v-model="form.email" type="email" :placeholder="t('users.emailPlaceholder')" />
        </div>
        <div class="field">
          <label for="password">{{ t('users.tempPassword') }}</label>
          <Password id="password" v-model="form.password" :feedback="false" toggle-mask :placeholder="t('users.passwordHint')" />
        </div>
        <Message v-if="formError" severity="error" :closable="false">{{ formError }}</Message>
      </div>

      <template #footer>
        <Button :label="t('common.cancel')" severity="secondary" @click="showDialog = false" />
        <Button :label="t('common.create')" :loading="saving" @click="createUser" />
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useI18n } from 'vue-i18n'
import { useTheme } from '../../composables/useTheme.js'
import api from '../../api/axios'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Message from 'primevue/message'

const { t } = useI18n()
const toast = useToast()
const { isDark } = useTheme()

const users = ref([])
const loading = ref(false)
const showDialog = ref(false)
const saving = ref(false)
const formError = ref('')
const form = reactive({ fullName: '', email: '', password: '' })

async function load() {
  loading.value = true
  try {
    const { data } = await api.get('/admin/users')
    users.value = data.data
  } finally {
    loading.value = false
  }
}

function openCreateDialog() {
  form.fullName = ''
  form.email = ''
  form.password = ''
  formError.value = ''
  showDialog.value = true
}

async function createUser() {
  formError.value = ''
  if (!form.fullName || !form.email || !form.password) {
    formError.value = t('users.allRequired')
    return
  }
  saving.value = true
  try {
    const { data } = await api.post('/admin/users', {
      email: form.email,
      fullName: form.fullName,
      password: form.password
    })
    if (data.success) {
      showDialog.value = false
      toast.add({ severity: 'success', summary: t('users.created'), life: 3000 })
      load()
    } else {
      formError.value = data.error || t('users.createFailed')
    }
  } catch (e) {
    formError.value = e.response?.data?.error || t('common.connectionError')
  } finally {
    saving.value = false
  }
}

async function deactivate(user) {
  try {
    await api.patch(`/admin/users/${user.id}/deactivate`)
    toast.add({ severity: 'warn', summary: `${user.fullName} ${t('users.deactivated')}`, life: 3000 })
    load()
  } catch {
    toast.add({ severity: 'error', summary: t('users.deactivateFailed'), life: 3000 })
  }
}

onMounted(load)
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
  --th-bg:      rgba(248,250,248,0.90);
  --row-hover:  rgba(45,106,79,0.04);
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
.page {
  padding: 32px;
  max-width: 1000px;
  min-height: 100vh;
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
  color: var(--text);
  margin: 0 0 4px;
}

.subtitle {
  color: var(--muted);
  font-size: 14px;
  margin: 0;
}

/* ── Knop ────────────────────────────────────────────────────────────────── */
.btn-accent :deep(.p-button) {
  background: var(--accent-dim) !important;
  border-color: var(--accent) !important;
  color: var(--accent) !important;
}

/* ── Tabel kaart ─────────────────────────────────────────────────────────── */
.table-wrap {
  padding: 0;
  overflow: hidden;
}

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

.table-wrap :deep(.p-datatable-thead > tr > th) {
  background: var(--th-bg);
  color: var(--muted);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-color: var(--border);
}

.table-wrap :deep(.p-datatable-tbody > tr > td) {
  color: var(--text);
  border-color: var(--border);
  font-size: 13px;
}

.table-wrap :deep(.p-datatable-tbody > tr:hover > td) {
  background: var(--row-hover) !important;
}

.table-wrap :deep(.p-datatable) {
  background: transparent;
}

.table-wrap :deep(.p-datatable-wrapper) {
  background: transparent;
}

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

/* ── Deactiveer knop ─────────────────────────────────────────────────────── */
.btn-deactivate {
  padding: 5px 12px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--btn);
  color: var(--muted);
  font-size: 12px;
  cursor: pointer;
  transition: background .15s, color .15s;
}

.btn-deactivate:hover {
  background: var(--btn-hover);
  color: var(--text);
}

/* ── Empty state ─────────────────────────────────────────────────────────── */
.empty-state {
  text-align: center;
  padding: 48px;
  color: var(--muted);
}

.empty-state i { font-size: 32px; display: block; margin-bottom: 8px; }
.empty-state p { margin: 0; font-size: 14px; }

/* ── Dialog formulier ────────────────────────────────────────────────────── */
.dialog-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-top: 8px;
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

.field :deep(.p-inputtext),
.field :deep(.p-password-input) { width: 100%; }
.field :deep(.p-password) { width: 100%; }
</style>
