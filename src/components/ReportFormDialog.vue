<template>
  <Dialog
    v-model:visible="visible"
    :header="t('reportForm.title')"
    :style="{ width: '460px' }"
    modal
    @hide="reset"
  >
    <div class="form">
      <div class="field">
        <label>{{ t('reportForm.client') }} <span class="req">*</span></label>
        <Select
          v-model="form.clientId"
          :options="clients"
          option-label="companyName"
          option-value="id"
          :placeholder="t('reportForm.chooseClient')"
          filter
          :loading="loadingClients"
          :disabled="!!fixedClientId"
          class="w-full"
        />
      </div>

      <div class="field">
        <label>{{ t('reportForm.visitDate') }} <span class="req">*</span></label>
        <DatePicker
          v-model="form.visitDate"
          date-format="dd-mm-yy"
          :placeholder="t('reportForm.chooseDate')"
          :max-date="new Date()"
          class="w-full"
        />
      </div>

      <div class="field" v-if="plannedVisits.length > 0">
        <label>{{ t('reportForm.linkVisit') }}</label>
        <Select
          v-model="form.plannedVisitId"
          :options="plannedVisitsOptions"
          option-label="label"
          option-value="value"
          :placeholder="t('reportForm.optional')"
          show-clear
          class="w-full"
        />
      </div>

      <div class="field" v-if="!isAdmin">
        <label>{{ t('reportForm.audio') }}</label>

        <!-- Recorded or selected file display -->
        <div v-if="audioFile" class="audio-file-info">
          <i class="pi pi-file-audio" />
          <span>{{ audioFile.name }}</span>
          <audio v-if="audioPreviewUrl" :src="audioPreviewUrl" controls class="audio-preview" />
          <Button icon="pi pi-times" text severity="secondary" size="small" @click="clearAudio" />
        </div>

        <!-- Controls when no file yet -->
        <div v-else class="audio-controls">
          <!-- Upload from file -->
          <input
            ref="fileInput"
            type="file"
            accept="audio/*,.m4a,.mp3,.wav,.ogg,.webm"
            class="hidden-input"
            @change="onFileChange"
          />
          <Button
            icon="pi pi-folder-open"
            :label="t('reportForm.chooseFile')"
            severity="secondary"
            outlined
            size="small"
            @click="fileInput.click()"
          />

          <!-- In-browser recording -->
          <Button
            v-if="!recording"
            icon="pi pi-microphone"
            :label="t('reportForm.record')"
            severity="danger"
            outlined
            size="small"
            @click="startRecording"
          />
          <Button
            v-else
            icon="pi pi-stop"
            :label="`${t('reportForm.stopRecording')} (${recordingSeconds}s)`"
            severity="danger"
            size="small"
            @click="stopRecording"
          />
        </div>

        <small class="hint">{{ t('reportForm.audioHint') }}</small>
      </div>
    </div>

    <template #footer>
      <Button :label="t('common.cancel')" severity="secondary" text @click="visible = false" />
      <Button
        :label="t('reportForm.create')"
        :loading="saving"
        :disabled="!isValid"
        @click="submit"
      />
    </template>
  </Dialog>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Dialog from 'primevue/dialog'
import Select from 'primevue/select'
import DatePicker from 'primevue/datepicker'
import Button from 'primevue/button'
import api from '../api/axios'
import { useAuthStore } from '../stores/auth'

const { t } = useI18n()

const props = defineProps({
  modelValue: Boolean,
  fixedClientId: { type: String, default: null },
  prefillVisitId: { type: String, default: null },
  prefillDate: { type: String, default: null }
})

const emit = defineEmits(['update:modelValue', 'saved'])
const toast = useToast()
const router = useRouter()
const { isAdmin } = useAuthStore()

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

const clients = ref([])
const loadingClients = ref(false)
const plannedVisits = ref([])
const saving = ref(false)
const audioFile = ref(null)
const audioPreviewUrl = ref(null)
const fileInput = ref(null)

// In-browser recording
const recording = ref(false)
const recordingSeconds = ref(0)
let mediaRecorder = null
let recordedChunks = []
let recordingTimer = null

const form = reactive({
  clientId: props.fixedClientId ?? null,
  visitDate: new Date(),
  plannedVisitId: null
})

const plannedVisitsOptions = computed(() =>
  plannedVisits.value.map(v => ({
    label: `${new Date(v.plannedDateTime).toLocaleDateString('nl-NL')} — ${v.purpose}`,
    value: v.id
  }))
)

const isValid = computed(() => form.clientId && form.visitDate)

async function loadClients() {
  loadingClients.value = true
  try {
    const { data } = await api.get('/clients')
    clients.value = data.data
  } catch {
    // ignore
  } finally {
    loadingClients.value = false
  }
}

async function loadPlannedVisits() {
  if (!form.clientId) { plannedVisits.value = []; return }
  try {
    const { data } = await api.get('/visits', {
      params: { clientId: form.clientId, status: 'Completed' }
    })
    plannedVisits.value = data.data
  } catch {
    plannedVisits.value = []
  }
}

function onFileChange(e) {
  const file = e.target.files[0] ?? null
  setAudioFile(file)
}

function setAudioFile(file) {
  audioFile.value = file
  if (audioPreviewUrl.value) URL.revokeObjectURL(audioPreviewUrl.value)
  audioPreviewUrl.value = file ? URL.createObjectURL(file) : null
}

function clearAudio() {
  setAudioFile(null)
  if (fileInput.value) fileInput.value.value = ''
}

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    recordedChunks = []
    mediaRecorder = new MediaRecorder(stream)
    mediaRecorder.ondataavailable = e => { if (e.data.size > 0) recordedChunks.push(e.data) }
    mediaRecorder.onstop = () => {
      stream.getTracks().forEach(t => t.stop())
      const blob = new Blob(recordedChunks, { type: 'audio/webm' })
      const file = new File([blob], `opname-${Date.now()}.webm`, { type: 'audio/webm' })
      setAudioFile(file)
    }
    mediaRecorder.start()
    recording.value = true
    recordingSeconds.value = 0
    recordingTimer = setInterval(() => recordingSeconds.value++, 1000)
  } catch {
    toast.add({ severity: 'error', summary: t('reportForm.micUnavailable'), detail: t('reportForm.micPermission'), life: 4000 })
  }
}

function stopRecording() {
  if (mediaRecorder && recording.value) {
    mediaRecorder.stop()
    recording.value = false
    clearInterval(recordingTimer)
  }
}

function reset() {
  form.clientId = props.fixedClientId ?? null
  form.visitDate = props.prefillDate ? new Date(props.prefillDate) : new Date()
  form.plannedVisitId = props.prefillVisitId ?? null
  clearAudio()
  stopRecording()
}

watch(() => form.clientId, loadPlannedVisits)

watch(() => props.modelValue, (open) => {
  if (open) reset()
})

async function submit() {
  saving.value = true
  try {
    const { data } = await api.post('/reports', {
      clientId: form.clientId,
      visitDate: form.visitDate.toISOString(),
      plannedVisitId: form.plannedVisitId ?? null
    })
    const reportId = data.data.id

    // Upload audio if selected
    if (audioFile.value) {
      const fd = new FormData()
      fd.append('audio', audioFile.value)
      await api.post(`/reports/${reportId}/audio`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      toast.add({ severity: 'info', summary: t('reportForm.audioUploaded'), detail: t('reportForm.transcriptionStarted'), life: 4000 })
    }

    toast.add({ severity: 'success', summary: t('reportForm.created'), life: 3000 })
    visible.value = false
    emit('saved', reportId)
    router.push(`/reports/${reportId}`)
  } catch (e) {
    toast.add({
      severity: 'error',
      summary: t('common.error'),
      detail: e.response?.data?.error ?? t('reportForm.createFailed'),
      life: 4000
    })
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  if (!props.fixedClientId) {
    loadClients()
  } else {
    try {
      const { data } = await api.get(`/clients/${props.fixedClientId}`)
      clients.value = [data.data]
    } catch { /* ignore */ }
  }
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
.field :deep(.p-datepicker) {
  width: 100%;
}

.audio-upload {
  display: flex;
  align-items: center;
}

.hidden-input {
  display: none;
}

.audio-file-info {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #e7f5ff;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 13px;
  color: #1c7ed6;
  flex: 1;
}

.audio-file-info .pi {
  font-size: 16px;
}

.hint {
  font-size: 11px;
  color: #adb5bd;
}
</style>
