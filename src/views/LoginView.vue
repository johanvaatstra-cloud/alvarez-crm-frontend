<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-header">
        <div class="logo-mark">AC</div>
        <h1>Alvarez Catalunya</h1>
        <p>{{ t('login.title') }}</p>
      </div>

      <form @submit.prevent="handleLogin" class="login-form">
        <div class="field">
          <label for="email">{{ t('login.email') }}</label>
          <InputText
            id="email"
            v-model="form.email"
            type="email"
            :placeholder="t('login.emailPlaceholder')"
            :disabled="loading"
            autocomplete="username"
          />
        </div>

        <div class="field">
          <label for="password">{{ t('login.password') }}</label>
          <Password
            id="password"
            v-model="form.password"
            placeholder="••••••••"
            :feedback="false"
            :disabled="loading"
            toggle-mask
            autocomplete="current-password"
          />
        </div>

        <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>

        <Button
          type="submit"
          :label="t('login.submit')"
          :loading="loading"
          class="login-btn"
        />
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Button from 'primevue/button'
import Message from 'primevue/message'

const { t } = useI18n()
const router = useRouter()
const auth = useAuthStore()

const form = reactive({ email: '', password: '' })
const loading = ref(false)
const error = ref('')

async function handleLogin() {
  error.value = ''
  loading.value = true
  try {
    const result = await auth.login(form.email, form.password)
    if (result.success) {
      router.push('/dashboard')
    } else {
      error.value = result.error || t('login.failed')
    }
  } catch (e) {
    error.value = e.response?.data?.error || t('login.connectionError')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  /* background comes from glass-theme.css body rules */
  position: relative;
  overflow: hidden;
}

/* decorative blobs */
.login-page::before,
.login-page::after {
  content: '';
  position: fixed;
  border-radius: 50%;
  filter: blur(72px);
  pointer-events: none;
  z-index: 0;
}

.login-page::before {
  width: 500px;
  height: 500px;
  top: -100px;
  right: -80px;
  background: radial-gradient(circle, rgba(74,222,128,0.22) 0%, transparent 68%);
}

.login-page::after {
  width: 400px;
  height: 400px;
  bottom: -80px;
  left: -60px;
  background: radial-gradient(circle, rgba(74,222,128,0.15) 0%, transparent 68%);
}

.login-card {
  background: var(--card);
  border-radius: 20px;
  border-top: 1px solid var(--card-top);
  border-left: 1px solid var(--card-left);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  padding: 48px 40px;
  width: 100%;
  max-width: 400px;
  box-shadow: var(--shadow);
  position: relative;
  z-index: 1;
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.logo-mark {
  width: 56px;
  height: 56px;
  background: var(--accent);
  color: #0f1923;
  border-radius: 12px;
  font-size: 20px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
}

.login-header h1 {
  font-size: 22px;
  font-weight: 700;
  color: var(--accent);
  margin: 0 0 4px;
}

.login-header p {
  color: var(--text-2);
  font-size: 14px;
  margin: 0;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text);
}

.field :deep(.p-inputtext),
.field :deep(.p-password-input) {
  width: 100%;
  background: var(--input-bg) !important;
  border-color: var(--input-border) !important;
  color: var(--text) !important;
}

.login-btn {
  width: 100%;
  background: var(--accent) !important;
  border-color: var(--accent) !important;
  color: #0f1923 !important;
  font-size: 15px;
  padding: 12px;
  font-weight: 600;
}

.login-btn:hover {
  filter: brightness(1.1);
}
</style>
