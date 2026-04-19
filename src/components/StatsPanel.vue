<script setup>
import { computed } from 'vue'
import { useApplicationsStore, STAGE_LABELS, STAGES } from '@/stores/applications.js'

const store = useApplicationsStore()
const stats = computed(() => store.stats)

const interviewRateDisplay = computed(() =>
  (stats.value.interviewRate * 100).toFixed(0) + '%',
)

const funnelRows = computed(() =>
  STAGES.map((stage) => ({
    stage,
    label: STAGE_LABELS[stage],
    count: stats.value.byStage[stage],
    pct: stats.value.total === 0
      ? 0
      : Math.round((stats.value.byStage[stage] / stats.value.total) * 100),
  })),
)
</script>

<template>
  <section class="stats-panel" aria-label="数据统计">
    <div class="stats-rail">
      <!-- Horizontal metrics strip — not the hero metric card grid -->
      <div class="stats-metrics">
        <div class="metric">
          <span class="metric__value metric__value--primary">{{ stats.total }}</span>
          <span class="metric__label">条申请</span>
        </div>
        <div class="metric-sep" aria-hidden="true" />
        <div class="metric">
          <span class="metric__value">{{ interviewRateDisplay }}</span>
          <span class="metric__label">面试转化</span>
        </div>
        <div class="metric-sep" aria-hidden="true" />
        <div class="metric">
          <span class="metric__value metric__value--success">{{ stats.offerCount }}</span>
          <span class="metric__label">Offer</span>
        </div>
        <div class="metric-sep" aria-hidden="true" />
        <div class="metric">
          <span
            :class="['metric__value', stats.urgentCount > 0 ? 'metric__value--warn' : '']"
          >{{ stats.urgentCount }}</span>
          <span class="metric__label">7日内到期</span>
        </div>
      </div>

      <!-- Funnel — right panel -->
      <div class="funnel">
        <span class="funnel__label">申请漏斗</span>
        <div class="funnel__rows">
          <div
            v-for="row in funnelRows"
            :key="row.stage"
            class="funnel__row"
          >
            <span class="funnel__stage">{{ row.label }}</span>
            <div class="funnel__track">
              <div
                :class="['funnel__fill', `funnel__fill--${row.stage}`]"
                :style="{ width: row.pct + '%' }"
              />
            </div>
            <span class="funnel__num">{{ row.count }}</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
