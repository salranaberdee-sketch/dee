<template>
  <div class="my-progress-section">
    <div class="section-header">
      <div class="section-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
        </svg>
      </div>
      <span class="section-title">แผนพัฒนาของฉัน</span>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <span>กำลังโหลด...</span>
    </div>

    <!-- Empty State -->
    <div v-else-if="progressList.length === 0" class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
      </svg>
      <p>ยังไม่มีแผนพัฒนาที่ถูกกำหนด</p>
    </div>

    <!-- Progress List -->
    <div v-else class="progress-list">
      <div v-for="progress in progressList" :key="progress.id" class="progress-card">
        <div class="progress-header">
          <h4>{{ progress.plan?.name || 'แผนพัฒนา' }}</h4>
          <span class="level-badge">ระดับ {{ progress.current_level }}/{{ progress.plan?.total_levels }}</span>
        </div>

        <p class="plan-description" v-if="progress.plan?.description">
          {{ progress.plan.description }}
        </p>

        <!-- Progress Bar -->
        <div class="progress-bar-section">
          <div class="progress-bar-container">
            <div 
              class="progress-bar" 
              :style="{ width: `${getProgressPercent(progress)}%` }"
            ></div>
          </div>
          <span class="progress-percent">{{ getProgressPercent(progress) }}%</span>
        </div>

        <!-- Current Level Info -->
        <div class="current-level-info" v-if="getCurrentLevelInfo(progress)">
          <div class="level-name">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <span>{{ getCurrentLevelInfo(progress).name }}</span>
          </div>
          <p v-if="getCurrentLevelInfo(progress).description" class="level-description">
            {{ getCurrentLevelInfo(progress).description }}
          </p>
        </div>

        <!-- Next Level Preview -->
        <div class="next-level-preview" v-if="getNextLevelInfo(progress)">
          <span class="next-label">ระดับถัดไป:</span>
          <span class="next-name">{{ getNextLevelInfo(progress).name }}</span>
        </div>

        <!-- Actions -->
        <div class="progress-actions">
          <button class="btn-view-history" @click="viewHistory(progress)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            ดูประวัติ
          </button>
        </div>
      </div>
    </div>

    <!-- History Modal -->
    <Modal v-if="showHistoryModal" @close="showHistoryModal = false" size="medium">
      <template #header>
        <h2>ประวัติการเลื่อนระดับ</h2>
      </template>
      <template #body>
        <div class="history-list">
          <div v-if="history.length === 0" class="empty-history">
            <p>ยังไม่มีประวัติ</p>
          </div>
          <div v-for="item in history" :key="item.id" class="history-item">
            <div class="history-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 5v14M5 12h14"/>
              </svg>
            </div>
            <div class="history-content">
              <div class="history-levels">
                <span v-if="item.previous_level">ระดับ {{ item.previous_level }}</span>
                <span v-else>เริ่มต้น</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
                <span>ระดับ {{ item.new_level }}</span>
              </div>
              <p class="history-notes" v-if="item.notes">{{ item.notes }}</p>
              <span class="history-date">{{ formatDate(item.created_at) }}</span>
            </div>
          </div>
        </div>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAthleteProgressStore } from '@/stores/athleteProgress'
import Modal from '@/components/Modal.vue'

const progressStore = useAthleteProgressStore()

const loading = ref(false)
const showHistoryModal = ref(false)
const selectedProgress = ref(null)

// Data
const progressList = ref([])
const history = ref([])

// คำนวณเปอร์เซ็นต์ความคืบหน้า
function getProgressPercent(progress) {
  if (!progress.plan?.total_levels) return 0
  return Math.round((progress.current_level / progress.plan.total_levels) * 100)
}

// ดึงข้อมูลระดับปัจจุบัน
function getCurrentLevelInfo(progress) {
  if (!progress.plan?.levels) return null
  return progress.plan.levels.find(l => l.level_number === progress.current_level)
}

// ดึงข้อมูลระดับถัดไป
function getNextLevelInfo(progress) {
  if (!progress.plan?.levels) return null
  if (progress.current_level >= progress.plan.total_levels) return null
  return progress.plan.levels.find(l => l.level_number === progress.current_level + 1)
}

// Format วันที่
function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// ดูประวัติ
async function viewHistory(progress) {
  selectedProgress.value = progress
  const result = await progressStore.fetchAthleteHistory(progress.athlete_id, progress.plan_id)
  if (result.success) {
    history.value = result.data
  }
  showHistoryModal.value = true
}

// โหลดข้อมูลเมื่อ mount
onMounted(async () => {
  loading.value = true
  const result = await progressStore.fetchMyProgress()
  if (result.success) {
    progressList.value = result.data
  }
  loading.value = false
})
</script>

<style scoped>
.my-progress-section {
  background: #fff;
  border-radius: 12px;
  border: 1px solid #E5E5E5;
  overflow: hidden;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid #F5F5F5;
}

.section-icon {
  width: 40px;
  height: 40px;
  background: #171717;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.section-icon svg {
  width: 20px;
  height: 20px;
  color: #fff;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #171717;
}

.loading-state,
.empty-state {
  padding: 32px;
  text-align: center;
  color: #737373;
}

.empty-state svg {
  width: 48px;
  height: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.progress-list {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.progress-card {
  background: #FAFAFA;
  border-radius: 12px;
  padding: 16px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.progress-header h4 {
  font-size: 16px;
  font-weight: 600;
  color: #171717;
  margin: 0;
}

.level-badge {
  background: #171717;
  color: #fff;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.plan-description {
  font-size: 13px;
  color: #737373;
  margin: 0 0 12px;
}

.progress-bar-section {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.progress-bar-container {
  flex: 1;
  height: 8px;
  background: #E5E5E5;
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: #171717;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-percent {
  font-size: 14px;
  font-weight: 600;
  color: #171717;
  min-width: 45px;
  text-align: right;
}

.current-level-info {
  background: #fff;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
}

.level-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  color: #171717;
}

.level-name svg {
  width: 16px;
  height: 16px;
  color: #22C55E;
}

.level-description {
  font-size: 13px;
  color: #737373;
  margin: 8px 0 0;
}

.next-level-preview {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #737373;
  margin-bottom: 12px;
}

.next-label {
  color: #A3A3A3;
}

.next-name {
  color: #525252;
  font-weight: 500;
}

.progress-actions {
  display: flex;
  justify-content: flex-end;
}

.btn-view-history {
  display: flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: 1px solid #E5E5E5;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 13px;
  color: #525252;
  cursor: pointer;
}

.btn-view-history:hover {
  background: #F5F5F5;
}

.btn-view-history svg {
  width: 16px;
  height: 16px;
}

/* History Modal */
.history-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.empty-history {
  text-align: center;
  padding: 24px;
  color: #737373;
}

.history-item {
  display: flex;
  gap: 12px;
}

.history-icon {
  width: 32px;
  height: 32px;
  background: #D1FAE5;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.history-icon svg {
  width: 16px;
  height: 16px;
  color: #065F46;
}

.history-content {
  flex: 1;
}

.history-levels {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  color: #171717;
}

.history-levels svg {
  width: 16px;
  height: 16px;
  color: #737373;
}

.history-notes {
  font-size: 13px;
  color: #525252;
  margin: 4px 0;
}

.history-date {
  font-size: 12px;
  color: #A3A3A3;
}
</style>
