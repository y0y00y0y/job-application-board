<script setup>
defineProps({
  user: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['add', 'logout'])
</script>

<template>
  <header class="app-header">
    <div class="app-header__brand">
      <span class="app-header__wordmark">求职<span class="app-header__wordmark-accent">看板</span></span>
      <span class="app-header__tagline">万物皆有其季节 </span>
    </div>

    <div class="app-header__actions">
      <span v-if="user" class="app-header__user">{{ user.email }}</span>
      <button
        class="btn btn--primary"
        aria-label="新增申请"
        @click="emit('add')"
      >
        + 新增申请
      </button>
      <button
        class="btn btn--ghost"
        type="button"
        @click="emit('logout')"
      >
        退出
      </button>
    </div>
  </header>
</template>
