<script setup>
import { computed, ref, onMounted } from 'vue'
import { useApplicationsStore } from '@/stores/applications.js'
import { useAuthStore } from '@/stores/auth.js'
import AuthView from '@/components/AuthView.vue'
import AppHeader from '@/components/AppHeader.vue'
import UrgentBanner from '@/components/UrgentBanner.vue'
import StatsPanel from '@/components/StatsPanel.vue'
import KanbanBoard from '@/components/KanbanBoard.vue'
import ApplicationModal from '@/components/ApplicationModal.vue'

const store = useApplicationsStore()
const auth = useAuthStore()
const ready = computed(() => !auth.initializing)

onMounted(async () => {
  await auth.initialize()
  if (auth.isAuthenticated) await store.fetchApplications()
})

// ── 弹窗状态 ──
const modalOpen = ref(false)
/** null = 新增；Application 对象 = 编辑 */
const editTarget = ref(null)

function openAdd() {
  editTarget.value = null
  modalOpen.value = true
}

function openEdit(app) {
  editTarget.value = app
  modalOpen.value = true
}

function closeModal() {
  modalOpen.value = false
  editTarget.value = null
}

async function handleDelete(id) {
  const app = store.getById(id)
  if (!app) return
  if (!confirm(`确认删除「${app.company}」的申请记录？此操作不可撤销。`)) return
  await store.deleteApplication(id)
}

async function handleAuthenticated() {
  await store.fetchApplications()
}

async function handleLogout() {
  await auth.logout()
}
</script>

<template>
  <div v-if="!ready" class="boot-screen">正在进入看板...</div>

  <AuthView
    v-else-if="!auth.isAuthenticated"
    @authenticated="handleAuthenticated"
  />

  <div v-else class="app-layout">
    <AppHeader
      :user="auth.user"
      @add="openAdd"
      @logout="handleLogout"
    />
    <UrgentBanner />

    <main class="app-main">
      <p v-if="store.error" class="app-error">{{ store.error }}</p>
      <StatsPanel />
      <KanbanBoard
        @edit-card="openEdit"
        @delete-card="handleDelete"
      />
    </main>

    <Teleport to="body">
      <ApplicationModal
        v-if="modalOpen"
        :edit-target="editTarget"
        @close="closeModal"
      />
    </Teleport>
  </div>
</template>
