<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1>{{ t('users.title') }}</h1>
        <p class="subtitle">{{ t('users.subtitle') }}</p>
      </div>
      <Button :label="t('users.addEmployee')" icon="pi pi-plus" @click="openCreateDialog" />
    </div>

    <div class="card">
      <DataTable :value="users" :loading="loading">
        <Column field="fullName" :header="t('common.name')" />
        <Column field="email" :header="t('common.email')" />
        <Column field="isActive" :header="t('common.status')">
          <template #body="{ data }">
            <Tag
              :value="data.isActive ? t('common.active') : t('common.inactive')"
              :severity="data.isActive ? 'success' : 'secondary'"
            />
          </template>
        </Column>
        <Column :header="t('common.actions')" style="width: 120px">
          <template #body="{ data }">
            <Button
              v-if="data.isActive"
              :label="t('users.deactivate')"
              severity="secondary"
              size="small"
              @click="deactivate(data)"
            />
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
import api from '../../api/axios'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Message from 'primevue/message'

const { t } = useI18n()
const toast = useToast()
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
.page {
  padding: 32px;
  max-width: 1000px;
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
  color: #1b4332;
  margin: 0 0 4px;
}

.subtitle {
  color: #6c757d;
  font-size: 14px;
  margin: 0;
}

.page-header :deep(.p-button) {
  background: var(--green-primary) !important;
  border-color: var(--green-primary) !important;
}

.card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.card :deep(.p-datatable-thead > tr > th) {
  background: #f8f9fa;
  color: #6c757d;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-color: #e9ecef;
}

.empty-state {
  text-align: center;
  padding: 48px;
  color: #adb5bd;
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
.field :deep(.p-password-input) {
  width: 100%;
}

.field :deep(.p-password) {
  width: 100%;
}
</style>
