<template>
  <Dialog
    v-model:visible="visible"
    :header="editId ? t('visitForm.editTitle') : t('visitForm.planTitle')"
    :style="{ width: '500px' }"
    modal
    @hide="reset"
  >
    <div class="form">
      <div class="field">
        <label>{{ t('visitForm.client') }} <span class="req">*</span></label>
        <Select
          v-model="form.clientId"
          :options="clients"
          option-label="companyName"
          option-value="id"
          :placeholder="t('visitForm.chooseClient')"
          filter
          :loading="loadingClients"
          :disabled="!!fixedClientId || !!editId"
          class="w-full"
        />
      </div>

      <div class="field">
        <label>{{ t('visitForm.date') }} <span class="req">*</span></label>
        <DatePicker
          v-model="form.plannedDate"
          date-format="dd-mm-yy"
          :placeholder="t('visitForm.chooseDate')"
          :min-date="editId ? null : new Date()"
          class="w-full"
        />
      </div>

      <div class="field">
        <label>{{ t('visitForm.time') }} <span class="req">*</span></label>
        <div class="time-row">
          <Select
            v-model="form.hour"
            :options="hourOptions"
            option-label="label"
            option-value="value"
            :placeholder="t('visitForm.hour')"
            class="time-select"
          />
          <span class="time-sep">:</span>
          <Select
            v-model="form.minute"
            :options="minuteOptions"
            option-label="label"
            option-value="value"
            :placeholder="t('visitForm.minute')"
            class="time-select"
          />
        </div>
      </div>

      <div class="field">
        <label>{{ t('visitForm.estimatedDuration') }}</label>
        <Select
          v-model="form.estimatedDurationMinutes"
          :options="durationOptions"
          option-label="label"
          option-value="value"
          class="w-full"
        />
      </div>

      <div class="field">
        <label>{{ t('visitForm.purpose') }} <span class="req">*</span></label>
        <Textarea
          v-model="form.purpose"
          rows="3"
          :placeholder="t('visitForm.purposePlaceholder')"
          class="w-full"
          auto-resize
        />
      </div>

      <!-- Suggestions (shown when editing, if client has suggestions) -->
      <div
        v-if="editId && suggestions.length > 0"
        class="suggestions-section"
        @click="goToSuggestions"
      >
        <div class="suggestions-header">
          <i class="pi pi-star" />
          <span>{{ t('visitForm.productAdvice') }}</span>
          <i class="pi pi-arrow-right suggestions-arrow" />
        </div>
        <div v-for="s in suggestions" :key="s.id" class="suggestion-row">
          <i class="pi pi-circle-fill dot" :class="s.wasAccepted === true ? 'accepted' : s.wasAccepted === false ? 'rejected' : ''" />
          <span class="suggestion-text">{{ s.productName }}</span>
          <span v-if="s.suggestionType === 'Promotion'" class="suggestion-type-badge badge-promo">{{ t('visitForm.promotion') }}</span>
          <span v-else-if="s.suggestionType === 'NewProduct'" class="suggestion-type-badge badge-new">{{ t('visitForm.new') }}</span>
          <span v-else class="suggestion-reason">{{ s.reason }}</span>
        </div>
      </div>
    </div>

    <template #footer>
      <Button :label="t('common.cancel')" severity="secondary" text @click="visible = false" />
      <Button
        :label="editId ? t('visitForm.save') : t('visitForm.plan')"
        :loading="saving"
        :disabled="!isValid"
        @click="submit"
      />
    </template>
  </Dialog>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { useI18n } from 'vue-i18n'
import Dialog from 'primevue/dialog'
import Select from 'primevue/select'
import DatePicker from 'primevue/datepicker'
import Textarea from 'primevue/textarea'
import Button from 'primevue/button'
import api from '../api/axios'

const { t } = useI18n()

const props = defineProps({
  modelValue: Boolean,
  fixedClientId: { type: String, default: null },
  editVisit: { type: Object, default: null }
})

const emit = defineEmits(['update:modelValue', 'saved'])
const toast = useToast()

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

const router = useRouter()
const editId = computed(() => props.editVisit?.id ?? null)

function goToSuggestions() {
  const clientId = props.editVisit?.clientId
  if (!clientId) return
  visible.value = false
  router.push(`/clients/${clientId}?tab=suggestions`)
}

const durationOptions = computed(() => [
  { label: t('visitForm.dur30'), value: 30 },
  { label: t('visitForm.dur60'), value: 60 },
  { label: t('visitForm.dur90'), value: 90 },
  { label: t('visitForm.dur120'), value: 120 }
])

const hourOptions = Array.from({ length: 24 }, (_, i) => ({
  label: String(i).padStart(2, '0'),
  value: i
}))

const minuteOptions = Array.from({ length: 12 }, (_, i) => ({
  label: String(i * 5).padStart(2, '0'),
  value: i * 5
}))

const clients = ref([])
const loadingClients = ref(false)
const saving = ref(false)
const suggestions = ref([])

const form = reactive({
  clientId: null,
  plannedDate: null,
  hour: 9,
  minute: 0,
  estimatedDurationMinutes: 60,
  purpose: ''
})

const isValid = computed(() =>
  form.clientId && form.plannedDate && form.hour !== null && form.minute !== null && form.purpose.trim().length > 0
)

async function loadClients() {
  loadingClients.value = true
  try {
    const { data } = await api.get('/clients')
    clients.value = data.data
  } catch {
    // silently ignore
  } finally {
    loadingClients.value = false
  }
}

async function loadSuggestions(clientId) {
  if (!clientId) { suggestions.value = []; return }
  try {
    const { data } = await api.get(`/clients/${clientId}/suggestions`)
    suggestions.value = (data.data ?? []).filter(s => s.wasAccepted === null || s.wasAccepted === true)
  } catch {
    suggestions.value = []
  }
}

function reset() {
  form.clientId = props.fixedClientId ?? null
  form.plannedDate = null
  form.hour = 9
  form.minute = 0
  form.estimatedDurationMinutes = 60
  form.purpose = ''
  suggestions.value = []
}

watch(
  () => props.modelValue,
  async (open) => {
    if (open) {
      if (props.editVisit) {
        const dt = new Date(props.editVisit.plannedDateTime)
        form.clientId = props.editVisit.clientId
        form.plannedDate = dt
        form.hour = dt.getHours()
        form.minute = Math.round(dt.getMinutes() / 5) * 5
        form.estimatedDurationMinutes = props.editVisit.estimatedDurationMinutes ?? 60
        form.purpose = props.editVisit.purpose ?? ''
        await loadSuggestions(props.editVisit.clientId)
      } else {
        reset()
      }
    }
  }
)

async function submit() {
  saving.value = true
  try {
    const dt = new Date(form.plannedDate)
    dt.setHours(form.hour, form.minute, 0, 0)

    if (editId.value) {
      await api.patch(`/visits/${editId.value}`, {
        plannedDateTime: dt.toISOString(),
        estimatedDurationMinutes: form.estimatedDurationMinutes,
        purpose: form.purpose
      })
    } else {
      await api.post('/visits', {
        clientId: form.clientId,
        plannedDateTime: dt.toISOString(),
        estimatedDurationMinutes: form.estimatedDurationMinutes,
        purpose: form.purpose
      })
    }
    toast.add({ severity: 'success', summary: editId.value ? t('visitForm.savedSuccess') : t('visitForm.plannedSuccess'), life: 3000 })
    visible.value = false
    emit('saved')
  } catch (e) {
    toast.add({
      severity: 'error',
      summary: t('common.error'),
      detail: e.response?.data?.message ?? t('visitForm.saveFailed'),
      life: 4000
    })
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  if (!props.fixedClientId) loadClients()
})
</script>

<style scoped>
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

.time-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.time-select {
  flex: 1;
}

.time-sep {
  font-size: 18px;
  font-weight: 600;
  color: #495057;
  line-height: 1;
}

/* Suggestions */
.suggestions-section {
  background: #f8fff9;
  border: 1px solid #d3f9d8;
  border-radius: 8px;
  padding: 12px;
  cursor: pointer;
  transition: background 0.15s, box-shadow 0.15s;
}

.suggestions-section:hover {
  background: #f0fdf4;
  box-shadow: 0 2px 8px rgba(45, 106, 79, 0.12);
}

.suggestions-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #2d6a4f;
  margin-bottom: 10px;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.suggestions-arrow {
  margin-left: auto;
  font-size: 11px;
  opacity: 0.6;
}

.suggestion-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 4px 0;
  border-bottom: 1px solid #e9ecef;
  font-size: 12px;
}

.suggestion-row:last-child { border-bottom: none; }

.dot { font-size: 6px; color: #adb5bd; flex-shrink: 0; margin-top: 4px; }
.dot.accepted { color: #40c057; }
.dot.rejected { color: #fa5252; }

.suggestion-text { font-weight: 500; color: #212529; white-space: nowrap; }
.suggestion-reason { color: #868e96; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.suggestion-type-badge {
  font-size: 10px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 10px;
  white-space: nowrap;
  flex-shrink: 0;
}

.badge-promo { background: #fff3bf; color: #e67700; border: 1px solid #ffe066; }
.badge-new   { background: #d3f9d8; color: #2f9e44; border: 1px solid #8ce99a; }
</style>
