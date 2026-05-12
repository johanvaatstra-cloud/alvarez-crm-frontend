import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../api/axios'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('crm_token') || null)
  const user = ref(JSON.parse(localStorage.getItem('crm_user') || 'null'))

  const isAuthenticated = computed(() => !!token.value)
  const isAdmin = computed(() => user.value?.role === 'Admin')
  const fullName = computed(() => user.value?.fullName || '')

  async function login(email, password) {
    const { data } = await api.post('/auth/login', { email, password })
    if (data.success) {
      token.value = data.data.accessToken
      user.value = {
        id: data.data.userId,
        role: data.data.role,
        fullName: data.data.fullName
      }
      localStorage.setItem('crm_token', token.value)
      localStorage.setItem('crm_user', JSON.stringify(user.value))
    }
    return data
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem('crm_token')
    localStorage.removeItem('crm_user')
  }

  return { token, user, isAuthenticated, isAdmin, fullName, login, logout }
})
