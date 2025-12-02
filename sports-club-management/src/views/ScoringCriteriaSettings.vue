<template>
  <div class="scoring-criteria-settings">
    <!-- Header -->
    <div class="page-header">
      <div class="header-content">
        <router-link to="/evaluation" class="back-link">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </router-link>
        <div>
          <h1>ตั้งค่าเกณฑ์คะแนน</h1>
          <p class="subtitle">กำหนดน้ำหนักคะแนนและเงื่อนไขพิเศษ</p>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>กำลังโหลดข้อมูล...</p>
    </div>

    <!-- Main Content -->
    <div v-else class="content-wrapper">
      <!-- Weights Section -->
      <section class="settings-section">
        <div class="section-header">
          <div class="section-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div>
            <h2>น้ำหนักคะแนนหลัก</h2>
            <p>กำหนดสัดส่วนคะแนนแต่ละหมวด (รวมต้องเท่ากับ 100%)</p>
          </div>
        </div>

        <div class="weights-grid">
          <!-- Attendance Weight -->
          <div class="weight-item">
            <div class="weight-header">
              <label>การเข้าร่วม</label>
              <span class="weight-value">{{ localCriteria.attendance_weight }}%</span>
            </div>
            <input 
              type="range" 
              v-model.number="localCriteria.attendance_weight"
              min="0" 
              max="100" 
              step="5"
              class="weight-slider"
            />
            <input 
              type="number" 
              v-model.number="localCriteria.attendance_weight"
              min="0" 
              max="100"
              class="weight-input"
            />
          </div>

          <!-- Training Weight -->
          <div class="weight-item">
            <div class="weight-header">
              <label>การฝึกซ้อม</label>
              <span class="weight-value">{{ localCriteria.training_weight }}%</span>
            </div>
            <input 
              type="range" 
              v-model.number="localCriteria.training_weight"
              min="0" 
              max="100" 
              step="5"
              class="weight-slider"
            />
            <input 
              type="number" 
              v-model.number="localCriteria.training_weight"
              min="0" 
              max="100"
              class="weight-input"
            />
          </div>

          <!-- Rating Weight -->
          <div class="weight-item">
            <div class="weight-header">
              <label>Rating</label>
              <span class="weight-value">{{ localCriteria.rating_weight }}%</span>
            </div>
            <input 
              type="range" 
              v-model.number="localCriteria.rating_weight"
              min="0" 
              max="100" 
              step="5"
              class="weight-slider"
            />
            <input 
              type="number" 
              v-model.number="localCriteria.rating_weight"
              min="0" 
              max="100"
              class="weight-input"
            />
          </div>
        </div>

        <!-- Weights Sum Validation -->
        <div class="weights-summary" :class="{ invalid: !isValidWeights }">
          <span class="sum-label">รวม:</span>
          <span class="sum-value">{{ totalWeights }}%</span>
          <span v-if="!isValidWeights" class="error-message">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            น้ำหนักรวมต้องเท่ากับ 100%
          </span>
          <span v-else class="success-message">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            ถูกต้อง
          </span>
        </div>

        <!-- Target Training Sessions -->
        <div class="target-sessions">
          <label>เป้าหมายการฝึกซ้อม (ครั้ง/เดือน)</label>
          <input 
            type="number" 
            v-model.number="localCriteria.target_training_sessions"
            min="1" 
            max="31"
            class="sessions-input"
          />
        </div>
      </section>

      <!-- Conditions Section -->
      <section class="settings-section">
        <div class="section-header">
          <div class="section-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="12" y1="18" x2="12" y2="12"/>
              <line x1="9" y1="15" x2="15" y2="15"/>
            </svg>
          </div>
          <div>
            <h2>เงื่อนไขคะแนนพิเศษ</h2>
            <p>เพิ่มโบนัสหรือหักคะแนนตามเงื่อนไข</p>
          </div>
          <button @click="showConditionForm = true" class="btn-add">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            เพิ่มเงื่อนไข
          </button>
        </div>

        <!-- Conditions List -->
        <div v-if="conditions.length > 0" class="conditions-list">
          <div 
            v-for="condition in conditions" 
            :key="condition.id" 
            class="condition-card"
            :class="{ inactive: !condition.is_active }"
          >
            <div class="condition-info">
              <div class="condition-header">
                <span class="condition-name">{{ condition.name }}</span>
                <span 
                  class="condition-type-badge" 
                  :class="condition.condition_type"
                >
                  {{ condition.condition_type === 'bonus' ? 'โบนัส' : 'หักคะแนน' }}
                </span>
              </div>
              <div class="condition-details">
                <span class="category">{{ getCategoryLabel(condition.category) }}</span>
                <span class="threshold">
                  {{ getThresholdLabel(condition) }}
                </span>
                <span class="points" :class="condition.condition_type">
                  {{ condition.points > 0 ? '+' : '' }}{{ condition.points }} คะแนน
                </span>
              </div>
              <p v-if="condition.description" class="condition-description">
                {{ condition.description }}
              </p>
            </div>
            <div class="condition-actions">
              <label class="toggle-switch">
                <input 
                  type="checkbox" 
                  :checked="condition.is_active"
                  @change="toggleCondition(condition)"
                />
                <span class="toggle-slider"></span>
              </label>
              <button @click="editCondition(condition)" class="btn-icon" title="แก้ไข">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
              <button @click="confirmDeleteCondition(condition)" class="btn-icon danger" title="ลบ">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                  <line x1="10" y1="11" x2="10" y2="17"/>
                  <line x1="14" y1="11" x2="14" y2="17"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="empty-conditions">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          <p>ยังไม่มีเงื่อนไขพิเศษ</p>
          <button @click="showConditionForm = true" class="btn-secondary">
            เพิ่มเงื่อนไขแรก
          </button>
        </div>
      </section>

      <!-- Save Button -->
      <div class="save-section">
        <button 
          @click="saveCriteria" 
          class="btn-save"
          :disabled="!isValidWeights || saving"
        >
          <span v-if="saving" class="spinner-small"></span>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
            <polyline points="17 21 17 13 7 13 7 21"/>
            <polyline points="7 3 7 8 15 8"/>
          </svg>
          {{ saving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า' }}
        </button>
      </div>
    </div>

    <!-- Condition Form Modal -->
    <Modal 
      v-if="showConditionForm" 
      :title="editingCondition ? 'แก้ไขเงื่อนไข' : 'เพิ่มเงื่อนไขใหม่'"
      @close="closeConditionForm"
    >
      <ScoringConditionForm
        :condition="editingCondition"
        :club-id="clubId"
        @save="handleConditionSave"
        @cancel="closeConditionForm"
      />
    </Modal>

    <!-- Delete Confirmation Modal -->
    <Modal 
      v-if="showDeleteConfirm" 
      title="ยืนยันการลบ"
      @close="showDeleteConfirm = false"
    >
      <div class="delete-confirm">
        <p>คุณต้องการลบเงื่อนไข "{{ conditionToDelete?.name }}" หรือไม่?</p>
        <p class="warning-text">การลบจะไม่สามารถกู้คืนได้</p>
      </div>
      <template #footer>
        <div class="modal-actions">
          <button @click="showDeleteConfirm = false" class="btn-secondary">
            ยกเลิก
          </button>
          <button @click="deleteCondition" class="btn-danger" :disabled="deleting">
            <span v-if="deleting" class="spinner-small"></span>
            {{ deleting ? 'กำลังลบ...' : 'ลบเงื่อนไข' }}
          </button>
        </div>
      </template>
    </Modal>

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
import { useScoringCriteriaStore } from '@/stores/scoringCriteria'
import { useAuthStore } from '@/stores/auth'
import Modal from '@/components/Modal.vue'
import ScoringConditionForm from '@/components/ScoringConditionForm.vue'

const scoringCriteriaStore = useScoringCriteriaStore()
const authStore = useAuthStore()

// State
const loading = ref(true)
const saving = ref(false)
const deleting = ref(false)
const showConditionForm = ref(false)
const showDeleteConfirm = ref(false)
const editingCondition = ref(null)
const conditionToDelete = ref(null)

// Local criteria state for editing
const localCriteria = ref({
  attendance_weight: 40,
  training_weight: 30,
  rating_weight: 30,
  target_training_sessions: 12
})

// Toast notification
const toast = ref({
  show: false,
  type: 'success',
  message: ''
})

// Computed
const clubId = computed(() => authStore.profile?.club_id)
const conditions = computed(() => scoringCriteriaStore.conditions)

const totalWeights = computed(() => {
  return (
    (localCriteria.value.attendance_weight || 0) +
    (localCriteria.value.training_weight || 0) +
    (localCriteria.value.rating_weight || 0)
  )
})

const isValidWeights = computed(() => totalWeights.value === 100)

// Methods
function getCategoryLabel(category) {
  const labels = {
    attendance: 'การเข้าร่วม',
    training: 'การฝึกซ้อม',
    rating: 'Rating',
    custom: 'กำหนดเอง'
  }
  return labels[category] || category
}

function getThresholdLabel(condition) {
  const operators = {
    '>=': '≥',
    '>': '>',
    '<=': '≤',
    '<': '<',
    '=': '='
  }
  const typeLabels = {
    percentage: '%',
    count: 'ครั้ง',
    value: ''
  }
  return `${operators[condition.comparison_operator] || condition.comparison_operator} ${condition.threshold_value}${typeLabels[condition.threshold_type] || ''}`
}

async function loadData() {
  loading.value = true
  try {
    if (clubId.value) {
      await Promise.all([
        scoringCriteriaStore.fetchCriteria(clubId.value),
        scoringCriteriaStore.fetchConditions(clubId.value)
      ])
      
      // Update local state from store
      if (scoringCriteriaStore.criteria) {
        localCriteria.value = {
          ...localCriteria.value,
          attendance_weight: scoringCriteriaStore.criteria.attendance_weight || 40,
          training_weight: scoringCriteriaStore.criteria.training_weight || 30,
          rating_weight: scoringCriteriaStore.criteria.rating_weight || 30,
          target_training_sessions: scoringCriteriaStore.criteria.target_training_sessions || 12
        }
      }
    }
  } catch (error) {
    showToast('error', 'เกิดข้อผิดพลาดในการโหลดข้อมูล')
  } finally {
    loading.value = false
  }
}

async function saveCriteria() {
  if (!isValidWeights.value) {
    showToast('error', 'น้ำหนักรวมต้องเท่ากับ 100%')
    return
  }

  saving.value = true
  try {
    const result = await scoringCriteriaStore.saveCriteria({
      ...scoringCriteriaStore.criteria,
      club_id: clubId.value,
      attendance_weight: localCriteria.value.attendance_weight,
      training_weight: localCriteria.value.training_weight,
      rating_weight: localCriteria.value.rating_weight,
      target_training_sessions: localCriteria.value.target_training_sessions
    })

    if (result.success) {
      showToast('success', 'บันทึกการตั้งค่าสำเร็จ')
    } else {
      showToast('error', result.error || 'เกิดข้อผิดพลาดในการบันทึก')
    }
  } catch (error) {
    showToast('error', 'เกิดข้อผิดพลาดในการบันทึก')
  } finally {
    saving.value = false
  }
}

async function toggleCondition(condition) {
  const result = await scoringCriteriaStore.toggleCondition(condition.id, !condition.is_active)
  if (result.success) {
    showToast('success', condition.is_active ? 'ปิดใช้งานเงื่อนไขแล้ว' : 'เปิดใช้งานเงื่อนไขแล้ว')
  } else {
    showToast('error', result.error || 'เกิดข้อผิดพลาด')
  }
}

function editCondition(condition) {
  editingCondition.value = { ...condition }
  showConditionForm.value = true
}

function confirmDeleteCondition(condition) {
  conditionToDelete.value = condition
  showDeleteConfirm.value = true
}

async function deleteCondition() {
  if (!conditionToDelete.value) return

  deleting.value = true
  try {
    const result = await scoringCriteriaStore.deleteCondition(conditionToDelete.value.id)
    if (result.success) {
      showToast('success', 'ลบเงื่อนไขสำเร็จ')
      showDeleteConfirm.value = false
      conditionToDelete.value = null
    } else {
      showToast('error', result.error || 'เกิดข้อผิดพลาดในการลบ')
    }
  } catch (error) {
    showToast('error', 'เกิดข้อผิดพลาดในการลบ')
  } finally {
    deleting.value = false
  }
}

function closeConditionForm() {
  showConditionForm.value = false
  editingCondition.value = null
}

async function handleConditionSave(conditionData) {
  let result
  if (editingCondition.value?.id) {
    result = await scoringCriteriaStore.updateCondition(editingCondition.value.id, conditionData)
  } else {
    result = await scoringCriteriaStore.addCondition({
      ...conditionData,
      club_id: clubId.value
    })
  }

  if (result.success) {
    showToast('success', editingCondition.value ? 'แก้ไขเงื่อนไขสำเร็จ' : 'เพิ่มเงื่อนไขสำเร็จ')
    closeConditionForm()
  } else {
    showToast('error', result.error || 'เกิดข้อผิดพลาด')
  }
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
.scoring-criteria-settings {
  padding: 1.5rem;
  max-width: 800px;
  margin: 0 auto;
  padding-bottom: 100px;
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

.spinner-small {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  display: inline-block;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

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

.section-header {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1.5rem;
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

.btn-add {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: #171717;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.875rem;
  margin-left: auto;
  white-space: nowrap;
}

.btn-add svg {
  width: 16px;
  height: 16px;
}

.weights-grid {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.weight-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.weight-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.weight-header label {
  font-weight: 500;
  color: #171717;
}

.weight-value {
  font-weight: 600;
  color: #171717;
  font-size: 1.125rem;
}

.weight-slider {
  width: 100%;
  height: 8px;
  -webkit-appearance: none;
  appearance: none;
  background: #E5E5E5;
  border-radius: 4px;
  outline: none;
}

.weight-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  background: #171717;
  border-radius: 50%;
  cursor: pointer;
}

.weight-slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  background: #171717;
  border-radius: 50%;
  cursor: pointer;
  border: none;
}

.weight-input {
  width: 80px;
  padding: 0.5rem;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  font-size: 0.875rem;
  text-align: center;
}

.weights-summary {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: #D1FAE5;
  border-radius: 8px;
  margin-top: 1rem;
}

.weights-summary.invalid {
  background: #FEE2E2;
}

.sum-label {
  font-weight: 500;
  color: #065F46;
}

.weights-summary.invalid .sum-label {
  color: #991B1B;
}

.sum-value {
  font-weight: 700;
  font-size: 1.25rem;
  color: #065F46;
}

.weights-summary.invalid .sum-value {
  color: #991B1B;
}

.error-message, .success-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  margin-left: auto;
}

.error-message {
  color: #991B1B;
}

.success-message {
  color: #065F46;
}

.error-message svg, .success-message svg {
  width: 16px;
  height: 16px;
}

.target-sessions {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #E5E5E5;
}

.target-sessions label {
  display: block;
  font-weight: 500;
  color: #171717;
  margin-bottom: 0.5rem;
}

.sessions-input {
  width: 100px;
  padding: 0.5rem 0.75rem;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  font-size: 0.875rem;
}

.conditions-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.condition-card {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1rem;
  background: #FAFAFA;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  gap: 1rem;
}

.condition-card.inactive {
  opacity: 0.6;
}

.condition-info {
  flex: 1;
  min-width: 0;
}

.condition-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.condition-name {
  font-weight: 600;
  color: #171717;
}

.condition-type-badge {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
}

.condition-type-badge.bonus {
  background: #D1FAE5;
  color: #065F46;
}

.condition-type-badge.penalty {
  background: #FEE2E2;
  color: #991B1B;
}

.condition-details {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: #525252;
  flex-wrap: wrap;
}

.condition-details .category {
  background: #F5F5F5;
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
}

.condition-details .points {
  font-weight: 600;
}

.condition-details .points.bonus {
  color: #065F46;
}

.condition-details .points.penalty {
  color: #991B1B;
}

.condition-description {
  font-size: 0.875rem;
  color: #737373;
  margin: 0.5rem 0 0;
}

.condition-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #D4D4D4;
  transition: 0.3s;
  border-radius: 24px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

.toggle-switch input:checked + .toggle-slider {
  background-color: #171717;
}

.toggle-switch input:checked + .toggle-slider:before {
  transform: translateX(20px);
}

.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: #fff;
  color: #525252;
  cursor: pointer;
}

.btn-icon:hover {
  background: #E5E5E5;
}

.btn-icon.danger:hover {
  background: #FEE2E2;
  color: #991B1B;
}

.btn-icon svg {
  width: 16px;
  height: 16px;
}

.empty-conditions {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  color: #737373;
  text-align: center;
}

.empty-conditions svg {
  width: 48px;
  height: 48px;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-conditions p {
  margin: 0 0 1rem;
}

.btn-secondary {
  padding: 0.5rem 1rem;
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

.save-section {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 1rem;
  background: #fff;
  border-top: 1px solid #E5E5E5;
  display: flex;
  justify-content: center;
}

.btn-save {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  max-width: 400px;
  padding: 0.875rem 1.5rem;
  background: #171717;
  color: #fff;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
}

.btn-save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-save svg {
  width: 20px;
  height: 20px;
}

.delete-confirm {
  text-align: center;
  padding: 1rem 0;
}

.delete-confirm p {
  margin: 0 0 0.5rem;
  color: #171717;
}

.warning-text {
  color: #991B1B;
  font-size: 0.875rem;
}

.modal-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.btn-danger {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: #EF4444;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.875rem;
}

.btn-danger:disabled {
  opacity: 0.5;
}

.toast {
  position: fixed;
  bottom: 80px;
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
  .scoring-criteria-settings {
    padding: 1rem;
  }

  .section-header {
    flex-wrap: wrap;
  }

  .btn-add {
    width: 100%;
    justify-content: center;
    margin-top: 0.5rem;
  }

  .condition-card {
    flex-direction: column;
  }

  .condition-actions {
    width: 100%;
    justify-content: flex-end;
    padding-top: 0.75rem;
    border-top: 1px solid #E5E5E5;
  }
}
</style>
