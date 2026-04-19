<script setup>
import { STAGES } from '@/stores/applications.js'
import KanbanColumn from './KanbanColumn.vue'

const emit = defineEmits(['edit-card', 'delete-card'])
</script>

<template>
  <div class="kanban-board" role="main" aria-label="求职看板">
    <KanbanColumn
      v-for="stage in STAGES"
      :key="stage"
      :stage="stage"
      @edit-card="(app) => emit('edit-card', app)"
      @delete-card="(id) => emit('delete-card', id)"
    />
  </div>
</template>
