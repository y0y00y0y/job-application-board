<script setup>
import { computed } from 'vue'
import { useApplicationsStore } from '@/stores/applications.js'

const store = useApplicationsStore()

const CATEGORIES = [
  {
    key: 'tech',
    label: '技术',
    keywords: ['前端', '后端', '开发', '工程师', '软件', '测试', '运维', '客户端', '服务端', '架构'],
  },
  {
    key: 'product',
    label: '产品',
    keywords: ['产品', '策划', '交互', '设计', '用户体验', '视觉'],
  },
  {
    key: 'data',
    label: '数据',
    keywords: ['数据', '算法', '分析', '机器学习', '模型', 'ai', 'AI'],
  },
  {
    key: 'ops',
    label: '运营',
    keywords: ['运营', '市场', '增长', '内容', '品牌', '商务', '销售'],
  },
  {
    key: 'other',
    label: '综合',
    keywords: [],
  },
]

function categoryFor(position) {
  const value = position.toLowerCase()
  return CATEGORIES.find((category) =>
    category.key !== 'other'
    && category.keywords.some((keyword) => value.includes(keyword.toLowerCase())),
  ) ?? CATEGORIES[CATEGORIES.length - 1]
}

const rows = computed(() => {
  const counts = Object.fromEntries(CATEGORIES.map((category) => [category.key, 0]))
  for (const app of store.applications) {
    counts[categoryFor(app.position).key] += 1
  }

  const max = Math.max(...Object.values(counts), 1)
  return CATEGORIES.map((category) => ({
    ...category,
    count: counts[category.key],
    ratio: counts[category.key] / max,
  }))
})

function pointFor(index, ratio, radius = 42) {
  const angle = -Math.PI / 2 + (Math.PI * 2 * index) / rows.value.length
  const distance = radius * ratio
  const x = 50 + Math.cos(angle) * distance
  const y = 50 + Math.sin(angle) * distance
  return `${x.toFixed(2)},${y.toFixed(2)}`
}

const gridPolygons = computed(() =>
  [0.33, 0.66, 1].map((ratio) =>
    rows.value.map((_, index) => pointFor(index, ratio)).join(' '),
  ),
)

const radarPoints = computed(() =>
  rows.value.map((row, index) => pointFor(index, Math.max(row.ratio, 0.06))).join(' '),
)

const labelPositions = computed(() =>
  rows.value.map((row, index) => {
    const [x, y] = pointFor(index, 1.18).split(',').map(Number)
    return { ...row, x, y }
  }),
)

const topCategory = computed(() =>
  rows.value.reduce((best, row) => (row.count > best.count ? row : best), rows.value[0]),
)
</script>

<template>
  <div class="position-radar" aria-label="岗位类型分布">
    <div class="position-radar__header">
      <span class="position-radar__label">岗位倾向</span>
      <span class="position-radar__summary">
        {{ topCategory.count > 0 ? `${topCategory.label}最多` : '暂无数据' }}
      </span>
    </div>

    <div class="position-radar__body">
      <svg class="position-radar__chart" viewBox="-8 -8 116 116" role="img" aria-label="岗位类型雷达图">
        <polygon
          v-for="polygon in gridPolygons"
          :key="polygon"
          class="position-radar__grid"
          :points="polygon"
        />
        <line
          v-for="(row, index) in rows"
          :key="row.key"
          class="position-radar__axis"
          x1="50"
          y1="50"
          :x2="pointFor(index, 1).split(',')[0]"
          :y2="pointFor(index, 1).split(',')[1]"
        />
        <polygon class="position-radar__shape" :points="radarPoints" />
        <circle
          v-for="(row, index) in rows"
          :key="`${row.key}-point`"
          class="position-radar__point"
          :cx="pointFor(index, Math.max(row.ratio, 0.06)).split(',')[0]"
          :cy="pointFor(index, Math.max(row.ratio, 0.06)).split(',')[1]"
          r="1.8"
        />
        <text
          v-for="label in labelPositions"
          :key="`${label.key}-label`"
          class="position-radar__text"
          :x="label.x"
          :y="label.y"
          text-anchor="middle"
          dominant-baseline="middle"
        >
          {{ label.label }}
        </text>
      </svg>

      <div class="position-radar__legend">
        <span
          v-for="row in rows"
          :key="row.key"
          class="position-radar__legend-item"
        >
          <span>{{ row.label }}</span>
          <strong>{{ row.count }}</strong>
        </span>
      </div>
    </div>
  </div>
</template>
