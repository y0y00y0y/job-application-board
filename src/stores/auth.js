import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { apiRequest } from '@/services/api.js'
import { useApplicationsStore } from '@/stores/applications.js'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const initializing = ref(true)
  const loading = ref(false)
  const error = ref('')

  const isAuthenticated = computed(() => user.value !== null)

  function setUser(nextUser) {
    user.value = nextUser
  }

  function setError(e) {
    error.value = e?.message ?? '认证失败，请稍后重试'
  }

  async function initialize() {
    initializing.value = true
    error.value = ''
    try {
      user.value = await apiRequest('/api/auth/me')
    } catch {
      user.value = null
    } finally {
      initializing.value = false
    }
  }

  async function login({ email, password }) {
    loading.value = true
    error.value = ''
    try {
      user.value = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: { email, password },
      })
      return user.value
    } catch (e) {
      setError(e)
      throw e
    } finally {
      loading.value = false
    }
  }

  async function register({ email, password }) {
    loading.value = true
    error.value = ''
    try {
      user.value = await apiRequest('/api/auth/register', {
        method: 'POST',
        body: { email, password },
      })
      return user.value
    } catch (e) {
      setError(e)
      throw e
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    await apiRequest('/api/auth/logout', { method: 'POST' }).catch(() => null)
    user.value = null
    useApplicationsStore().reset()
  }

  return {
    user,
    initializing,
    loading,
    error,
    isAuthenticated,
    initialize,
    login,
    register,
    logout,
    setUser,
  }
})
