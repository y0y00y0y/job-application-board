<script setup>
import { computed } from 'vue'
import { useApplicationsStore } from '@/stores/applications.js'
import { daysUntilDeadline } from '@/stores/applications.js'

const store = useApplicationsStore()

const urgentApps = computed(() => store.urgentApps)

function urgentLabel(app) {
  const days = daysUntilDeadline(app.deadline)
  if (days < 0) return `${app.company} 已过期`
  if (days === 0) return `${app.company} 今天截止`
  return `${app.company} 还剩 ${days} 天`
}
</script>

<template>
  <div v-if="urgentApps.length > 0" class="urgent-banner">
    <span class="urgent-banner__icon">⚠️</span>
    <span class="urgent-banner__label">紧急：</span>
    <div class="urgent-banner__list">
      <span
        v-for="app in urgentApps"
        :key="app.id"
        class="urgent-banner__item"
      >
        {{ urgentLabel(app) }}
      </span>
    </div>
  </div>
</template>
