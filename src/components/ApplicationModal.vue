<script setup>
import { reactive, computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useApplicationsStore, STAGE_LABELS, STAGES, PRIORITY_LABELS } from '@/stores/applications.js'

const props = defineProps({
  /** null = 新增模式；Application 对象 = 编辑模式 */
  editTarget: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['close'])

const store = useApplicationsStore()
const modalRef = ref(null)
const firstFieldRef = ref(null)
const previouslyFocused = document.activeElement

// ── 表单状态 ──
const todayStr = () => new Date().toISOString().slice(0, 10)

function emptyForm() {
  return {
    company: '',
    position: '',
    stage: 'applied',
    priority: 'medium',
    applyDate: todayStr(),
    deadline: '',
    link: '',
    notes: '',
  }
}

const form = reactive(emptyForm())
const errors = reactive({})

const isEdit = computed(() => props.editTarget !== null)
const title = computed(() => (isEdit.value ? '编辑申请' : '新增申请'))

// 编辑模式下回填数据
watch(
  () => props.editTarget,
  (target) => {
    if (target) {
      Object.assign(form, {
        company: target.company,
        position: target.position,
        stage: target.stage,
        priority: target.priority,
        applyDate: target.applyDate,
        deadline: target.deadline ?? '',
        link: target.link ?? '',
        notes: target.notes ?? '',
      })
    } else {
      Object.assign(form, emptyForm())
    }
    Object.keys(errors).forEach((k) => delete errors[k])
  },
  { immediate: true },
)

// ── 校验 ──
function validate() {
  Object.keys(errors).forEach((k) => delete errors[k])

  if (!form.company.trim()) errors.company = '请填写公司名称'
  if (!form.position.trim()) errors.position = '请填写申请岗位'
  if (!form.applyDate) errors.applyDate = '请选择投递日期'
  if (form.link && !isValidUrl(form.link)) errors.link = '链接格式不正确'

  return Object.keys(errors).length === 0
}

function isValidUrl(s) {
  try {
    new URL(s)
    return true
  } catch {
    return false
  }
}

// ── 提交 ──
async function onSubmit() {
  if (!validate()) return

  const payload = {
    company: form.company.trim(),
    position: form.position.trim(),
    stage: form.stage,
    priority: form.priority,
    applyDate: form.applyDate,
    deadline: form.deadline || null,
    link: form.link.trim() || null,
    notes: form.notes.trim(),
  }

  try {
    if (isEdit.value) {
      await store.updateApplication(props.editTarget.id, payload)
    } else {
      store.createApplication(payload)
    }
    emit('close')
  } catch (e) {
    errors.submit = e.message
  }
}

// ── 删除 ──
async function onDelete() {
  if (!confirm(`确认删除「${props.editTarget.company}」的申请记录？此操作不可撤销。`)) return
  await store.deleteApplication(props.editTarget.id)
  emit('close')
}

// 点击遮罩关闭
function onOverlayClick(e) {
  if (e.target === e.currentTarget) emit('close')
}

// ESC 关闭
function onKeydown(e) {
  if (e.key === 'Escape') emit('close')
  if (e.key !== 'Tab') return

  const focusable = modalRef.value?.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
  )
  const items = Array.from(focusable ?? []).filter((el) => !el.disabled)
  if (items.length === 0) return

  const first = items[0]
  const last = items[items.length - 1]
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault()
    first.focus()
  }
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
  firstFieldRef.value?.focus()
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  previouslyFocused?.focus?.()
})
</script>

<template>
  <div
    class="modal-overlay"
    role="dialog"
    :aria-label="title"
    aria-modal="true"
    @click="onOverlayClick"
  >
    <div ref="modalRef" class="modal">
      <!-- Header -->
      <div class="modal__header">
        <h2 class="modal__title">{{ title }}</h2>
        <button class="modal__close btn" title="关闭" @click="emit('close')">✕</button>
      </div>

      <!-- Body -->
      <form class="modal__body" @submit.prevent="onSubmit">
        <!-- 公司 + 岗位 -->
        <div class="form-row">
          <div class="form-group">
            <label class="form-label form-label--required" for="field-company">公司名称</label>
            <input
              id="field-company"
              ref="firstFieldRef"
              v-model="form.company"
              :class="['form-input', errors.company ? 'form-input--error' : '']"
              type="text"
              maxlength="50"
              placeholder="例：字节跳动"
              autocomplete="off"
            />
            <span v-if="errors.company" class="form-error">{{ errors.company }}</span>
          </div>

          <div class="form-group">
            <label class="form-label form-label--required" for="field-position">申请岗位</label>
            <input
              id="field-position"
              v-model="form.position"
              :class="['form-input', errors.position ? 'form-input--error' : '']"
              type="text"
              maxlength="100"
              placeholder="例：算法工程师"
              autocomplete="off"
            />
            <span v-if="errors.position" class="form-error">{{ errors.position }}</span>
          </div>
        </div>

        <!-- 阶段 + 投递日期 -->
        <div class="form-row">
          <div class="form-group">
            <label class="form-label form-label--required" for="field-stage">当前阶段</label>
            <select id="field-stage" v-model="form.stage" class="form-select">
              <option v-for="s in STAGES" :key="s" :value="s">{{ STAGE_LABELS[s] }}</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label form-label--required" for="field-apply-date">投递日期</label>
            <input
              id="field-apply-date"
              v-model="form.applyDate"
              :class="['form-input', errors.applyDate ? 'form-input--error' : '']"
              type="date"
            />
            <span v-if="errors.applyDate" class="form-error">{{ errors.applyDate }}</span>
          </div>
        </div>

        <!-- 截止日期 + 优先级 -->
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="field-deadline">截止日期</label>
            <input
              id="field-deadline"
              v-model="form.deadline"
              class="form-input"
              type="date"
              placeholder="无则留空"
            />
          </div>

          <div class="form-group">
            <label class="form-label">优先级</label>
            <div class="priority-radio-group">
              <label
                v-for="p in ['high', 'medium', 'low']"
                :key="p"
                :class="['priority-radio', form.priority === p ? 'priority-radio--selected' : '']"
              >
                <input v-model="form.priority" type="radio" :value="p" />
                <span :class="['priority-dot', `priority-dot--${p}`]" />
                {{ PRIORITY_LABELS[p] }}
              </label>
            </div>
          </div>
        </div>

        <!-- 链接 -->
        <div class="form-group">
          <label class="form-label" for="field-link">招聘链接</label>
          <input
            id="field-link"
            v-model="form.link"
            :class="['form-input', errors.link ? 'form-input--error' : '']"
            type="url"
            placeholder="https://..."
          />
          <span v-if="errors.link" class="form-error">{{ errors.link }}</span>
        </div>

        <!-- 备注 -->
        <div class="form-group">
          <label class="form-label" for="field-notes">备注</label>
          <textarea
            id="field-notes"
            v-model="form.notes"
            class="form-textarea"
            maxlength="500"
            placeholder="面试官、地点、注意事项…"
          />
        </div>

        <span v-if="errors.submit" class="form-error">{{ errors.submit }}</span>
      </form>

      <!-- Footer -->
      <div class="modal__footer">
        <div>
          <button
            v-if="isEdit"
            class="btn btn--danger-ghost"
            type="button"
            @click="onDelete"
          >
            🗑️ 删除
          </button>
        </div>
        <div class="modal__footer-right">
          <button class="btn btn--ghost" type="button" @click="emit('close')">取消</button>
          <button class="btn btn--primary" type="button" @click="onSubmit">
            {{ isEdit ? '保存修改' : '添加申请' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
