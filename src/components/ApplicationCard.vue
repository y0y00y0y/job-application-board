<script setup>
import { computed } from 'vue'
import { urgencyLevel, PRIORITY_LABELS } from '@/stores/applications.js'
import DeadlineBadge from './DeadlineBadge.vue'

const props = defineProps({
  application: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['edit', 'delete'])

const urgency = computed(() => urgencyLevel(props.application.deadline))

const cardClass = computed(() => {
  const cls = ['app-card']
  if (urgency.value === 'urgent' || urgency.value === 'expired') cls.push('app-card--urgent')
  else if (urgency.value === 'warning') cls.push('app-card--warning')
  return cls
})

const applyDateFormatted = computed(() => {
  const [, month, day] = props.application.applyDate.split('-')
  return `${Number(month)}/${Number(day)} 投递`
})

function onEdit(e) {
  e.stopPropagation()
  emit('edit', props.application)
}

function onDelete(e) {
  e.stopPropagation()
  emit('delete', props.application.id)
}
</script>

<template>
  <div :class="cardClass">
    <div class="app-card__header">
      <span class="app-card__company">{{ application.company }}</span>
      <div class="app-card__actions">
        <button class="btn btn--ghost btn--sm" title="编辑" @click="onEdit">✏️</button>
        <button class="btn btn--danger-ghost btn--sm" title="删除" @click="onDelete">🗑️</button>
      </div>
    </div>

    <div class="app-card__position">{{ application.position }}</div>

    <div class="app-card__meta">
      <DeadlineBadge :deadline="application.deadline" />
      <span
        v-if="!application.deadline"
        class="app-card__apply-date"
      >
        {{ applyDateFormatted }}
      </span>
    </div>

    <div
      v-if="application.deadline"
      class="app-card__apply-date"
      style="margin-top: 4px"
    >
      {{ applyDateFormatted }}
    </div>

    <div class="app-card__priority" style="margin-top: 6px">
      <span :class="['priority-dot', `priority-dot--${application.priority}`]" />
      {{ PRIORITY_LABELS[application.priority] }}优先级
    </div>

    <div
      v-if="application.notes"
      class="app-card__notes"
      :title="application.notes"
    >
      {{ application.notes.length > 44 ? application.notes.slice(0, 44) + '…' : application.notes }}
    </div>
  </div>
</template>
