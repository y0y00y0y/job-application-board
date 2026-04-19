<script setup>
import { computed, reactive, ref } from 'vue'
import { useAuthStore } from '@/stores/auth.js'

const emit = defineEmits(['authenticated'])

const auth = useAuthStore()
const mode = ref('login')
const errors = reactive({})
const form = reactive({
  email: '',
  password: '',
  confirmPassword: '',
})

const isRegister = computed(() => mode.value === 'register')

const passwordChecks = computed(() => ({
  length: form.password.length >= 8,
  letter: /[A-Za-z]/.test(form.password),
  number: /\d/.test(form.password),
  noSpace: form.password.trim() === form.password && form.password.length > 0,
}))

const passwordScore = computed(() =>
  Object.values(passwordChecks.value).filter(Boolean).length,
)

const passwordLabel = computed(() => {
  if (passwordScore.value <= 1) return '偏弱'
  if (passwordScore.value === 2) return '可用'
  if (passwordScore.value === 3) return '稳妥'
  return '很强'
})

function switchMode(nextMode) {
  mode.value = nextMode
  Object.keys(errors).forEach((key) => delete errors[key])
}

function validate() {
  Object.keys(errors).forEach((key) => delete errors[key])

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = '请输入有效邮箱'
  }

  if (!form.password) {
    errors.password = '请输入密码'
  } else if (isRegister.value && passwordScore.value < 4) {
    errors.password = '密码至少 8 位，包含字母和数字，且首尾不能有空格'
  }

  if (isRegister.value && form.password !== form.confirmPassword) {
    errors.confirmPassword = '两次输入的密码不一致'
  }

  return Object.keys(errors).length === 0
}

async function onSubmit() {
  if (!validate()) return

  const payload = {
    email: form.email.trim().toLowerCase(),
    password: form.password,
  }

  try {
    if (isRegister.value) await auth.register(payload)
    else await auth.login(payload)
    emit('authenticated')
  } catch (e) {
    errors.submit = e.message
  }
}
</script>

<template>
  <main class="auth-shell">
    <section class="auth-panel" aria-label="账户登录">
      <div class="auth-copy">
        <span class="auth-kicker">求职申请看板</span>
        <h1>整理申请，慢慢向前</h1>
        <p>
          把投递、笔试、面试和截止日期放在一处。少一点慌乱，多一点笃定。
        </p>
      </div>

      <form class="auth-form" @submit.prevent="onSubmit">
        <div class="auth-tabs" role="tablist" aria-label="认证方式">
          <button
            :class="['auth-tab', !isRegister ? 'auth-tab--active' : '']"
            type="button"
            @click="switchMode('login')"
          >
            登录
          </button>
          <button
            :class="['auth-tab', isRegister ? 'auth-tab--active' : '']"
            type="button"
            @click="switchMode('register')"
          >
            注册
          </button>
        </div>

        <div class="form-group">
          <label class="form-label form-label--required" for="auth-email">邮箱</label>
          <input
            id="auth-email"
            v-model="form.email"
            :class="['form-input', errors.email ? 'form-input--error' : '']"
            autocomplete="email"
            inputmode="email"
            placeholder="name@example.com"
            type="email"
          />
          <span v-if="errors.email" class="form-error">{{ errors.email }}</span>
        </div>

        <div class="form-group">
          <label class="form-label form-label--required" for="auth-password">密码</label>
          <input
            id="auth-password"
            v-model="form.password"
            :class="['form-input', errors.password ? 'form-input--error' : '']"
            :autocomplete="isRegister ? 'new-password' : 'current-password'"
            placeholder="至少 8 位，包含字母和数字"
            type="password"
          />
          <span v-if="errors.password" class="form-error">{{ errors.password }}</span>
        </div>

        <div v-if="isRegister" class="password-meter" aria-live="polite">
          <div class="password-meter__bar">
            <span :style="{ width: passwordScore * 25 + '%' }" />
          </div>
          <span>强度：{{ passwordLabel }}</span>
        </div>

        <div v-if="isRegister" class="password-rules">
          <span :class="passwordChecks.length ? 'is-ok' : ''">8 位以上</span>
          <span :class="passwordChecks.letter ? 'is-ok' : ''">包含字母</span>
          <span :class="passwordChecks.number ? 'is-ok' : ''">包含数字</span>
          <span :class="passwordChecks.noSpace ? 'is-ok' : ''">无首尾空格</span>
        </div>

        <div v-if="isRegister" class="form-group">
          <label class="form-label form-label--required" for="auth-confirm">确认密码</label>
          <input
            id="auth-confirm"
            v-model="form.confirmPassword"
            :class="['form-input', errors.confirmPassword ? 'form-input--error' : '']"
            autocomplete="new-password"
            placeholder="再输入一次密码"
            type="password"
          />
          <span v-if="errors.confirmPassword" class="form-error">{{ errors.confirmPassword }}</span>
        </div>

        <span v-if="errors.submit || auth.error" class="form-error">
          {{ errors.submit || auth.error }}
        </span>

        <button class="btn btn--primary auth-submit" type="submit" :disabled="auth.loading">
          {{ auth.loading ? '处理中...' : isRegister ? '创建账户' : '登录看板' }}
        </button>
      </form>
    </section>
  </main>
</template>
