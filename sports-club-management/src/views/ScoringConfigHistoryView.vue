<template>
  <div class="scoring-config-history-view">
    <!-- Header -->
    <div class="page-header">
      <div class="header-content">
        <router-link to="/scoring-hub" class="back-link">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </router-link>
        <div>
          <h1>ประวัติการตั้งค่าเกณฑ์</h1>
          <p class="subtitle">ดูและกู้คืนการตั้งค่าเกณฑ์เวอร์ชันก่อนหน้า</p>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>กำลังโหลดข้อมูล...</p>
    </div>

    <!-- No Config Warning -->
    <div v-else-if="!hasConfig" class="warning-card">
      <div class="warning-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>
      <h3>ยังไม่มีการตั้งค่าเกณฑ์</h3>
      <p>กรุณาตั้งค่าเกณฑ์การให้คะแนนก่อนดูประวัติ</p>
      <router-link to="/scoring-config" class="btn-primary">
        ไปตั้งค่าเกณฑ์
      </router-link>
    </div>

    <!-- Main Content -->
    <div v-else class="content-wrapper">
      <section class="settings-section">
        <ConfigHistoryView
          :config-id="configId"
          :current-version="currentVersion"
          @restored="handleRestored"
          @error="handleError"
        />
      </section>
    </div>

    <!-- Toast Notification -->
    <Transition name="toast">
      <div v-if="toast.show" class="toast" :class="toast.type">
        <svg v-if="toast.type === 'success'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span>{{ toast.message }}</span>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useScoringConfigStore } from '@/stores/scoringConfig'
import { useAuthStore } from '@/stores/auth'
import ConfigHistoryView from '@/components/ConfigHistoryView.vue'

const scoringConfigStore = useScoringConfigStore()
const authStore = useAuthStore()

// State
const loading = ref(true)

// Toast notification
const toast = ref({
  show: false,
  type: 'success',
  message: ''
})

// Computed
const clubId = computed(() => authStore.profile?.club_id)
const hasConfig = computed(() => !!scoringConfigStore.clubConfig)
const configId = computed(() => scoringConfigStore.clubConfig?.id || '')
const currentVersion = computed(() => scoringConfigStore.clubConfig?.version || 1)

// Methods
async function loadData() {
  loading.value = true
  try {
    if (clubId.value) {
      await scoringConfigStore.fetchClubConfig(clubId.value)
    }
  } catch (error) {
    console.error('Error loading data:', error)
    showToast('error', 'เกิดข้อผิดพลาดในการโหลดข้อมูล')
  } finally {
    loading.value = false
  }
}

function handleRestored(data) {
  showToast('success', 'กู้คืนการตั้งค่าสำเร็จ')
  // รีโหลดข้อมูล config
  if (clubId.value) {
    scoringConfigStore.fetchClubConfig(clubId.value)
  }
}

function handleError(message) {
  showToast('error', message)
}

function showToast(type, message) {
  toast.value = { show: true, type, message }
  setTimeout(() => {
    toast.value.show = false
  }, 3000)
}

// Watch for club changes
watch(clubId, (newClubId) => {
  if (newClubId) {
    loadData()
  }
})

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.scoring-config-history-view {
  padding: 1.5rem;
  max-width: 800px;
  margin: 0 auto;
  padding-bottom: 2rem;
}

.page-header {
  margin-bottom: 1.5rem;
}

.header-content {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.back-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: #F5F5F5;
  color: #525252;
  flex-shrink: 0;
}

.back-link:hover {
  background: #E5E5E5;
}

.back-link svg {
  width: 20px;
  height: 20px;
}

.page-header h1 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #171717;
  margin: 0;
}

.subtitle {
  color: #737373;
  margin: 0.25rem 0 0;
  font-size: 0.875rem;
}

/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 3rem;
  color: #737373;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #E5E5E5;
  border-top-color: #171717;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Warning Card */
.warning-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  background: #FEF3C7;
  border: 1px solid #F59E0B;
  border-radius: 12px;
  text-align: center;
}

.warning-icon {
  width: 64px;
  height: 64px;
  background: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
}

.warning-icon svg {
  width: 32px;
  height: 32px;
  color: #92400E;
}

.warning-card h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: #92400E;
  margin: 0 0 0.5rem;
}

.warning-card p {
  color: #92400E;
  margin: 0 0 1rem;
  font-size: 0.875rem;
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: #171717;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  text-decoration: none;
}

.btn-primary:hover {
  opacity: 0.9;
}

/* Content Wrapper */
.content-wrapper {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.settings-section {
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 12px;
  padding: 1.25rem;
}

/* Toast */
.toast {
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  border-radius: 8px;
  font-size: 0.875rem;
  z-index: 1001;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.toast.success {
  background: #D1FAE5;
  color: #065F46;
}

.toast.error {
  background: #FEE2E2;
  color: #991B1B;
}

.toast svg {
  width: 18px;
  height: 18px;
}

.toast-enter-active, .toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from, .toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}

@media (max-width: 640px) {
  .scoring-config-history-view {
    padding: 1rem;
  }
}
</style>
