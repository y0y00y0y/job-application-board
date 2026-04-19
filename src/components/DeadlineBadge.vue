<script setup>
import { computed } from 'vue'
import { daysUntilDeadline, urgencyLevel } from '@/stores/applications.js'

const props = defineProps({
  deadline: {
    type: String,
    default: null,
  },
})

const days = computed(() => daysUntilDeadline(props.deadline))
const level = computed(() => urgencyLevel(props.deadline))

const label = computed(() => {
  if (level.value === 'none') return ''
  if (level.value === 'expired') return '已过期'
  if (days.value === 0) return '今天截止'
  if (days.value === 1) return '明天截止'
  return `${days.value} 天后`
})

const icon = computed(() => {
  if (level.value === 'expired') return '🔴'
  if (level.value === 'urgent') return '⚠️'
  if (level.value === 'warning') return '🕐'
  return '📅'
})
</script>

<template>
  <span
    v-if="level !== 'none'"
    :class="['deadline-badge', `deadline-badge--${level}`]"
    :title="deadline"
  >
    {{ icon }} {{ label }}
  </span>
</template>
