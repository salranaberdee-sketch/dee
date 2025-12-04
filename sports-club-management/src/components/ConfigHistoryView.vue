<template>
  <div class="config-history-view">
    <!-- Header -->
    <div class="section-header">
      <div class="section-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
      </div>
      <div>
        <h2>ประวัติการเปลี่ยนแปลง</h2>
        <p>ดูและกู้คืนการตั้งค่าเกณฑ์เวอร์ชันก่อนหน้า</p>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>กำลังโหลดประวัติ...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="history.length === 0" class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
      <p>ยังไม่มีประวัติการเปลี่ยนแปลง</p>
    </div>

    <!-- History List -->
    <div v-else class="history-list">
      <div 
        v-for="item in history" 
        :key="item.id"
        class="history-item"
        :class="{ selected: selectedVersion === item.version }"
        @click="selectVersion(item)"
      >
        <div class="version-badge">v{{ item.version }}</div>
        <div class="history-info">
          <div class="history-date">{{ formatDate(item.changed_at) }}</div>
          <div class="history-summary">{{ item.change_summary || 'ไม่มีรายละเอียด' }}</div>
          <div class="history-user">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            {{ item.user_profiles?.full_name || item.user_profiles?.email || 'ไม่ทราบ' }}
          </div>
        </div>
        <div class="history-actions">
          <button 
            @click.stop="previewVersion(item)" 
            class="btn-icon"
            title="ดูตัวอย่าง"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
          <button 
            @click.stop="confirmRestore(item)" 
            class="btn-icon restore"
            title="กู้คืน"
            :disabled="item.version === currentVersion"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Preview Modal -->
    <Modal 
      v-if="showPreview" 
      title="ตัวอย่างเวอร์ชัน"
      size="large"
      @close="showPreview = false"
    >
      <div class="preview-content">
        <div class="preview-header">
          <span class="preview-version">Version {{ previewData?.version }}</span>
          <span class="preview-date">{{ formatDate(previewData?.changed_at) }}</span>
        </div>

        <!-- Preview Categories -->
        <div v-if="previewSnapshot" class="preview-categories">
          <h4>หมวดหมู่เกณฑ์</h4>
          <div 
            v-for="category in previewSnapshot.categories" 
            :key="category.id"
            class="preview-category"
          >
            <div class="category-header">
              <span class="category-name">{{ category.display_name }}</span>
              <span class="category-weight">{{ category.weight }}%</span>
            </div>
            <div class="category-metrics">
              <span 
                v-for="metric in getCategoryMetrics(category.id)" 
                :key="metric.id"
                class="metric-tag"
              >
                {{ metric.display_name }}
              </span>
            </div>
          </div>
        </div>

        <!-- Preview Tier Thresholds -->
        <div v-if="previewSnapshot?.config" class="preview-tiers">
          <h4>เกณฑ์ระดับผลงาน</h4>
          <div class="tier-list">
            <div class="tier-item excellent">
              <span class="tier-name">ยอดเยี่ยม</span>
              <span class="tier-value">≥ {{ previewSnapshot.config.tier_excellent_min }}%</span>
            </div>
            <div class="tier-item good">
              <span class="tier-name">ดี</span>
              <span class="tier-value">≥ {{ previewSnapshot.config.tier_good_min }}%</span>
            </div>
            <div class="tier-item average">
              <span class="tier-name">ปานกลาง</span>
              <span class="tier-value">≥ {{ previewSnapshot.config.tier_average_min }}%</span>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="modal-actions">
          <button @click="showPreview = false" class="btn-secondary">
            ปิด
          </button>
          <button 
            @click="confirmRestore(previewData)" 
            class="btn-primary"
            :disabled="previewData?.version === currentVersion"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
            </svg>
            กู้คืนเวอร์ชันนี้
          </button>
        </div>
      </template>
    </Modal>

    <!-- Restore Confirmation Modal -->
    <Modal 
      v-if="showRestoreConfirm" 
      title="ยืนยันการกู้คืน"
      @close="showRestoreConfirm = false"
    >
      <div class="restore-confirm">
        <div class="confirm-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8"/>
            <path d="M3 3v5h5"/>
          </svg>
        </div>
        <p>คุณต้องการกู้คืนการตั้งค่าเป็น <strong>Version {{ versionToRestore?.version }}</strong> หรือไม่?</p>
        <p class="warning-text">การกู้คืนจะสร้างเวอร์ชันใหม่โดยไม่ลบประวัติเดิม</p>
      </div>
      <template #footer>
        <div class="modal-actions">
          <button @click="showRestoreConfirm = false" class="btn-secondary">
            ยกเลิก
          </button>
          <button @click="executeRestore" class="btn-primary" :disabled="restoring">
            <span v-if="restoring" class="spinner-small"></span>
            {{ restoring ? 'กำลังกู้คืน...' : 'ยืนยันกู้คืน' }}
          </button>
        </div>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useScoringConfigStore } from '@/stores/scoringConfig'
import Modal from '@/components/Modal.vue'

const props = defineProps({
  configId: {
    type: String,
    required: true
  },
  currentVersion: {
    type: Number,
    default: 1
  }
})

const emit = defineEmits(['restored', 'error'])

const scoringConfigStore = useScoringConfigStore()

// State
const loading = ref(false)
const history = ref([])
const selectedVersion = ref(null)
const showPreview = ref(false)
const previewData = ref(null)
const previewSnapshot = ref(null)
const showRestoreConfirm = ref(false)
const versionToRestore = ref(null)
const restoring = ref(false)

// Methods
async function loadHistory() {
  if (!props.configId) return

  loading.value = true
  try {
    const data = await scoringConfigStore.fetchConfigHistory(props.configId)
    history.value = data || []
  } catch (err) {
    console.error('Error loading history:', err)
    emit('error', 'ไม่สามารถโหลดประวัติได้')
  } finally {
    loading.value = false
  }
}

function formatDate(dateString) {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function selectVersion(item) {
  selectedVersion.value = item.version
}

async function previewVersion(item) {
  previewData.value = item
  previewSnapshot.value = item.snapshot
  showPreview.value = true
}

function getCategoryMetrics(categoryId) {
  if (!previewSnapshot.value?.metrics) return []
  return previewSnapshot.value.metrics.filter(m => m.category_id === categoryId)
}

function confirmRestore(item) {
  versionToRestore.value = item
  showRestoreConfirm.value = true
  showPreview.value = false
}

async function executeRestore() {
  if (!versionToRestore.value || !props.configId) return

  restoring.value = true
  try {
    const result = await scoringConfigStore.restoreConfigVersion(
      props.configId,
      versionToRestore.value.version
    )

    if (result.success) {
      emit('restored', result.data)
      showRestoreConfirm.value = false
      versionToRestore.value = null
      // โหลดประวัติใหม่
      await loadHistory()
    } else {
      emit('error', result.error || 'ไม่สามารถกู้คืนได้')
    }
  } catch (err) {
    console.error('Error restoring:', err)
    emit('error', 'เกิดข้อผิดพลาดในการกู้คืน')
  } finally {
    restoring.value = false
  }
}

// Watch for configId changes
watch(() => props.configId, (newId) => {
  if (newId) {
    loadHistory()
  }
}, { immediate: true })

onMounted(() => {
  if (props.configId) {
    loadHistory()
  }
})
</script>


<style scoped>
.config-history-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.section-header {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.section-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: #171717;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.section-icon svg {
  width: 24px;
  height: 24px;
  color: #fff;
}

.section-header h2 {
  font-size: 1.125rem;
  font-weight: 600;
  color: #171717;
  margin: 0;
}

.section-header p {
  font-size: 0.875rem;
  color: #737373;
  margin: 0.25rem 0 0;
}

/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  color: #737373;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #E5E5E5;
  border-top-color: #171717;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 0.75rem;
}

.spinner-small {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  display: inline-block;
  margin-right: 0.5rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  color: #737373;
  text-align: center;
}

.empty-state svg {
  width: 48px;
  height: 48px;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-state p {
  margin: 0;
}

/* History List */
.history-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: #FAFAFA;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
}

.history-item:hover {
  background: #F5F5F5;
  border-color: #D4D4D4;
}

.history-item.selected {
  border-color: #171717;
  background: #fff;
}

.version-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 48px;
  height: 48px;
  background: #171717;
  color: #fff;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.875rem;
}

.history-info {
  flex: 1;
  min-width: 0;
}

.history-date {
  font-weight: 600;
  color: #171717;
  margin-bottom: 0.25rem;
}

.history-summary {
  font-size: 0.875rem;
  color: #525252;
  margin-bottom: 0.25rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.history-user {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
  color: #737373;
}

.history-user svg {
  width: 14px;
  height: 14px;
}

.history-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 8px;
  background: #fff;
  color: #525252;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-icon:hover {
  background: #E5E5E5;
}

.btn-icon.restore:hover:not(:disabled) {
  background: #D1FAE5;
  color: #065F46;
}

.btn-icon:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.btn-icon svg {
  width: 18px;
  height: 18px;
}

/* Preview Content */
.preview-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 1rem;
  border-bottom: 1px solid #E5E5E5;
}

.preview-version {
  font-weight: 700;
  font-size: 1.125rem;
  color: #171717;
}

.preview-date {
  font-size: 0.875rem;
  color: #737373;
}

.preview-categories h4,
.preview-tiers h4 {
  font-size: 0.875rem;
  font-weight: 600;
  color: #525252;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0 0 0.75rem;
}

.preview-category {
  padding: 0.75rem;
  background: #FAFAFA;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  margin-bottom: 0.5rem;
}

.category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.category-name {
  font-weight: 600;
  color: #171717;
}

.category-weight {
  font-weight: 700;
  color: #171717;
  background: #E5E5E5;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.875rem;
}

.category-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.metric-tag {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 4px;
  color: #525252;
}

/* Tier List */
.tier-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.tier-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  border-radius: 8px;
}

.tier-item.excellent {
  background: #D1FAE5;
  color: #065F46;
}

.tier-item.good {
  background: #DBEAFE;
  color: #1E40AF;
}

.tier-item.average {
  background: #FEF3C7;
  color: #92400E;
}

.tier-name {
  font-weight: 600;
}

.tier-value {
  font-weight: 700;
}

/* Restore Confirm */
.restore-confirm {
  text-align: center;
  padding: 1rem 0;
}

.confirm-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 1rem;
  background: #D1FAE5;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.confirm-icon svg {
  width: 32px;
  height: 32px;
  color: #065F46;
}

.restore-confirm p {
  margin: 0 0 0.5rem;
  color: #171717;
}

.warning-text {
  color: #737373;
  font-size: 0.875rem;
}

/* Modal Actions */
.modal-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.btn-secondary {
  padding: 0.625rem 1rem;
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.875rem;
  color: #171717;
}

.btn-secondary:hover {
  background: #F5F5F5;
}

.btn-primary {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  background: #171717;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.875rem;
}

.btn-primary:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary svg {
  width: 16px;
  height: 16px;
}

@media (max-width: 640px) {
  .history-item {
    flex-direction: column;
    align-items: stretch;
  }

  .version-badge {
    width: 100%;
    height: auto;
    padding: 0.5rem;
  }

  .history-actions {
    justify-content: flex-end;
    padding-top: 0.75rem;
    border-top: 1px solid #E5E5E5;
  }

  .modal-actions {
    flex-direction: column;
  }

  .btn-secondary,
  .btn-primary {
    width: 100%;
    justify-content: center;
  }
}
</style>
