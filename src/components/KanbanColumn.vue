<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import draggable from 'vuedraggable'
import { useApplicationsStore, STAGE_LABELS } from '@/stores/applications.js'
import ApplicationCard from './ApplicationCard.vue'

const props = defineProps({
  stage: {
    type: String,
    required: true,
  },
})

const emit = defineEmits(['edit-card', 'delete-card'])

const store = useApplicationsStore()
const cards = ref([])
const dragging = ref(false)

const columnLabel = computed(() => STAGE_LABELS[props.stage])
const count = computed(() => cards.value.length)

watch(
  () => store.byStage[props.stage],
  (nextCards) => {
    if (!dragging.value) cards.value = [...nextCards]
  },
  { immediate: true },
)

function orderedIds() {
  return cards.value.map((app) => app.id)
}

async function onChange(evt) {
  try {
    if (evt.added) {
      await store.moveToStage(evt.added.element.id, props.stage, orderedIds())
    } else if (evt.moved) {
      await store.reorderColumn(props.stage, orderedIds())
    }
  } finally {
    await nextTick()
    cards.value = [...store.byStage[props.stage]]
  }
}

function onDragStart() {
  dragging.value = true
}

async function onDragEnd() {
  dragging.value = false
  await nextTick()
  cards.value = [...store.byStage[props.stage]]
}
</script>

<template>
  <div class="kanban-column" :data-stage="stage">
    <div class="kanban-column__header">
      <span :class="['kanban-column__dot', `kanban-column__dot--${stage}`]" />
      <span class="kanban-column__title">{{ columnLabel }}</span>
      <span class="kanban-column__badge">{{ count }}</span>
    </div>

    <div class="kanban-column__body" :data-stage="stage">
      <draggable
        v-model="cards"
        group="applications"
        item-key="id"
        ghost-class="sortable-ghost"
        drag-class="sortable-drag"
        :data-stage="stage"
        animation="200"
        @start="onDragStart"
        @end="onDragEnd"
        @change="onChange"
      >
        <template #item="{ element }">
          <div :data-id="element.id">
            <ApplicationCard
              :application="element"
              @edit="(app) => emit('edit-card', app)"
              @delete="(id) => emit('delete-card', id)"
            />
          </div>
        </template>

        <template #footer>
          <div v-if="count === 0" class="kanban-column__empty">暂无申请</div>
        </template>
      </draggable>
    </div>
  </div>
</template>
