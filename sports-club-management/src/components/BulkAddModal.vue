<template>
  <Modal :show="show" size="large" @close="handleClose">
    <template #header>
      <h2>เพิ่มนักกีฬาเข้าแข่งขัน</h2>
    </template>
    
    <template #body>
      <div class="bulk-add-content">
        <!-- ขั้นตอนที่ 1: เลือกนักกีฬา -->
        <div v-if="step === 1" class="step-content">
          <BulkAthleteSelector
            :athletes="athletes"
            :existing-participant-ids="existingParticipantIds"
            :clubs="clubs"
            @update:selected="handleSelectionChange"
          />
        </div>

        <!-- ขั้นตอนที่ 2: กำหนดรุ่น/น้ำหนัก -->
        <div v-else-if="step === 2" class="step-content">
          <div class="confirmation-header">
            <div class="selected-summary">
              <span class="summary-count">{{ selectedAthleteIds.length }}</span>
              <span>นักกีฬาที่เลือก</span>
            </div>
          </div>

          <div class="form-section">
            <h4>กำหนดรุ่น/ประเภท (ทุกคน)</h4>
            <div class="form-group">
              <label>รุ่น/ประเภท</label>
              <input 
                type="text" 
                v-model="category" 
                placeholder="เช่น รุ่นเยาวชน, รุ่นทั่วไป"
              >
            </div>
            <div class="form-group">
              <label>รุ่นน้ำหนัก</label>
              <input 
                type="text" 
                v-model="weightClass" 
                placeholder="เช่น 50-55 กก."
              >
            </div>
          </div>

          <!-- รายชื่อที่เลือก -->
          <div class="selected-list">
            <h4>รายชื่อที่จะเพิ่ม</h4>
            <div class="athlete-chips">
              <div v-for="id in selectedAthleteIds" :key="id" class="athlete-chip">
                <span>{{ getAthleteName(id) }}</span>
                <button class="remove-chip" @click="removeFromSelection(id)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- ขั้นตอนที่ 3: แสดงผลลัพธ์ -->
        <div v-else-if="step === 3" class="step-content">
          <div class="result-container">
            <div v-if="result.success" class="result-success">
              <div class="result-icon success">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <h3>เพิ่มนักกีฬาสำเร็จ</h3>
              <p>เพิ่มนักกีฬา {{ result.addedCount }} คน</p>
            </div>
            
            <div v-else class="result-error">
              <div class="result-icon error">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
              <h3>เกิดข้อผิดพลาด</h3>
              <p>{{ result.message || 'ไม่สามารถเพิ่มนักกีฬาได้' }}</p>
            </div>

            <!-- แสดงรายการที่ล้มเหลว -->
            <div v-if="result.failures && result.failures.length > 0" class="failures-list">
              <h4>รายการที่ไม่สำเร็จ ({{ result.failedCount }})</h4>
              <div v-for="failure in result.failures" :key="failure.athleteId" class="failure-item">
                <span class="failure-name">{{ getAthleteName(failure.athleteId) }}</span>
                <span class="failure-reason">{{ failure.error }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="modal-actions">
        <!-- ขั้นตอนที่ 1 -->
        <template v-if="step === 1">
          <button class="btn-secondary" @click="handleClose">ยกเลิก</button>
          <button 
            class="btn-primary" 
            @click="goToStep2" 
            :disabled="selectedAthleteIds.length === 0"
          >
            ถัดไป ({{ selectedAthleteIds.length }})
          </button>
        </template>

        <!-- ขั้นตอนที่ 2 -->
        <template v-else-if="step === 2">
          <button class="btn-secondary" @click="step = 1">ย้อนกลับ</button>
          <button class="btn-primary" @click="submitBulkAdd" :disabled="loading">
            <span v-if="loading" class="loading-spinner"></span>
            <span v-else>เพิ่ม {{ selectedAthleteIds.length }} คน</span>
          </button>
        </template>

        <!-- ขั้นตอนที่ 3 -->
        <template v-else-if="step === 3">
          <button class="btn-primary" @click="handleComplete">เสร็จสิ้น</button>
        </template>
      </div>
    </template>
  </Modal>
</template>

<script setup>
import { ref, computed } from 'vue'
import Modal from '@/components/Modal.vue'
import BulkAthleteSelector from '@/components/BulkAthleteSelector.vue'
import { useDataStore } from '@/stores/data'
import { useAuthStore } from '@/stores/auth'
import { logTournamentActivity, ACTIONS, LOG_LEVELS } from '@/lib/tournamentLogger'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  tournamentId: {
    type: String,
    required: true
  },
  // รายการนักกีฬาทั้งหมด
  athletes: {
    type: Array,
    default: () => []
  },
  // รายการ ID ของนักกีฬาที่ลงทะเบียนแล้ว
  existingParticipantIds: {
    type: Array,
    default: () => []
  },
  // รายการชมรม
  clubs: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['close', 'success'])

const dataStore = useDataStore()
const authStore = useAuthStore()

// State
const step = ref(1)
const selectedAthleteIds = ref([])
const category = ref('')
const weightClass = ref('')
const loading = ref(false)
const result = ref({
  success: false,
  addedCount: 0,
  failedCount: 0,
  failures: [],
  message: ''
})

// ดึงชื่อนักกีฬาจาก ID
function getAthleteName(athleteId) {
  const athlete = props.athletes.find(a => a.id === athleteId)
  return athlete?.name || 'ไม่ทราบชื่อ'
}

// จัดการการเปลี่ยนแปลงการเลือก
function handleSelectionChange(selected) {
  selectedAthleteIds.value = selected
}

// ลบออกจากการเลือก
function removeFromSelection(athleteId) {
  selectedAthleteIds.value = selectedAthleteIds.value.filter(id => id !== athleteId)
}

// ไปขั้นตอนที่ 2
function goToStep2() {
  if (selectedAthleteIds.value.length > 0) {
    step.value = 2
  }
}

/**
 * ส่งข้อมูลเพิ่มนักกีฬา
 * Requirements: 1.3, 1.4, 1.5
 * - แสดง loading spinner ระหว่างดำเนินการ
 * - แสดงข้อความสำเร็จพร้อมจำนวนที่เพิ่ม
 * - จัดการ network errors อย่างเหมาะสม
 */
async function submitBulkAdd() {
  if (selectedAthleteIds.value.length === 0) return
  
  loading.value = true
  
  try {
    const payload = {
      tournamentId: props.tournamentId,
      athleteIds: selectedAthleteIds.value,
      category: category.value || null,
      weightClass: weightClass.value || null,
      registeredBy: authStore.user?.id
    }

    const res = await dataStore.bulkAddParticipants(payload)
    result.value = res

    // Log activity
    logTournamentActivity({
      action: ACTIONS.PARTICIPANT_BULK_ADD,
      userId: authStore.user?.id,
      userRole: authStore.profile?.role,
      tournamentId: props.tournamentId,
      details: { 
        count: selectedAthleteIds.value.length,
        addedCount: res.addedCount,
        failedCount: res.failedCount
      },
      level: res.success ? LOG_LEVELS.SUCCESS : LOG_LEVELS.WARNING
    })

    step.value = 3
  } catch (error) {
    // จัดการ network errors (Requirement 1.5)
    let errorMessage = 'เกิดข้อผิดพลาดในการเพิ่มนักกีฬา'
    
    // ตรวจสอบประเภทของ error
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      errorMessage = 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต'
    } else if (error.code === 'PGRST301') {
      errorMessage = 'ไม่มีสิทธิ์ในการดำเนินการนี้'
    } else if (error.message) {
      errorMessage = error.message
    }
    
    result.value = {
      success: false,
      addedCount: 0,
      failedCount: selectedAthleteIds.value.length,
      failures: [],
      message: errorMessage
    }
    step.value = 3
    
    console.error('Bulk add error:', error)
  } finally {
    loading.value = false
  }
}

// ปิด Modal
function handleClose() {
  resetState()
  emit('close')
}

// เสร็จสิ้นและปิด
function handleComplete() {
  if (result.value.addedCount > 0) {
    emit('success', result.value)
  }
  handleClose()
}

// Reset state
function resetState() {
  step.value = 1
  selectedAthleteIds.value = []
  category.value = ''
  weightClass.value = ''
  loading.value = false
  result.value = {
    success: false,
    addedCount: 0,
    failedCount: 0,
    failures: [],
    message: ''
  }
}
</script>


<style scoped>
.bulk-add-content {
  min-height: 300px;
}

.step-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ส่วนยืนยัน */
.confirmation-header {
  display: flex;
  justify-content: center;
  margin-bottom: 8px;
}

.selected-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: #171717;
  color: #fff;
  border-radius: 8px;
  font-size: 14px;
}

.summary-count {
  background: #fff;
  color: #171717;
  padding: 4px 12px;
  border-radius: 16px;
  font-weight: 700;
  font-size: 16px;
}

/* Form */
.form-section {
  background: #FAFAFA;
  border-radius: 8px;
  padding: 16px;
}

.form-section h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #171717;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 12px;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-group label {
  font-size: 13px;
  font-weight: 500;
  color: #525252;
}

.form-group input {
  padding: 10px 12px;
  border: 1px solid #E5E5E5;
  border-radius: 6px;
  font-size: 14px;
  background: #fff;
}

.form-group input:focus {
  outline: none;
  border-color: #171717;
}

/* รายชื่อที่เลือก */
.selected-list {
  margin-top: 8px;
}

.selected-list h4 {
  margin: 0 0 10px 0;
  font-size: 13px;
  font-weight: 600;
  color: #525252;
}

.athlete-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  max-height: 150px;
  overflow-y: auto;
  padding: 4px;
}

.athlete-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: #F5F5F5;
  border: 1px solid #E5E5E5;
  border-radius: 16px;
  font-size: 13px;
}

.remove-chip {
  background: none;
  border: none;
  padding: 2px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.remove-chip svg {
  width: 14px;
  height: 14px;
  color: #737373;
}

.remove-chip:hover svg {
  color: #EF4444;
}

/* ผลลัพธ์ */
.result-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px;
  text-align: center;
}

.result-success,
.result-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.result-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.result-icon.success {
  background: #D1FAE5;
}

.result-icon.success svg {
  width: 32px;
  height: 32px;
  color: #065F46;
}

.result-icon.error {
  background: #FEE2E2;
}

.result-icon.error svg {
  width: 32px;
  height: 32px;
  color: #991B1B;
}

.result-container h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #171717;
}

.result-container p {
  margin: 0;
  font-size: 14px;
  color: #525252;
}

/* รายการที่ล้มเหลว */
.failures-list {
  width: 100%;
  margin-top: 20px;
  text-align: left;
}

.failures-list h4 {
  margin: 0 0 10px 0;
  font-size: 13px;
  font-weight: 600;
  color: #991B1B;
}

.failure-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #FEF2F2;
  border-radius: 6px;
  margin-bottom: 6px;
  font-size: 13px;
}

.failure-name {
  font-weight: 500;
  color: #171717;
}

.failure-reason {
  color: #991B1B;
  font-size: 12px;
}

/* Modal Actions */
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.btn-primary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: #171717;
  color: #fff;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  min-width: 120px;
}

.btn-primary:hover:not(:disabled) {
  background: #262626;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: #fff;
  color: #171717;
  border: 1px solid #E5E5E5;
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
}

.btn-secondary:hover {
  background: #F5F5F5;
}

/* Loading Spinner */
.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #fff;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Responsive - Mobile First */
@media (max-width: 640px) {
  .bulk-add-content {
    min-height: 250px;
  }
  
  .step-content {
    gap: 20px;
  }
  
  /* ส่วนยืนยัน */
  .confirmation-header {
    margin-bottom: 12px;
  }
  
  .selected-summary {
    padding: 14px 20px;
    font-size: 15px;
    width: 100%;
    justify-content: center;
  }
  
  .summary-count {
    padding: 6px 14px;
    font-size: 18px;
  }
  
  /* Form - full width inputs */
  .form-section {
    padding: 16px;
    border-radius: 12px;
  }
  
  .form-section h4 {
    font-size: 15px;
    margin-bottom: 14px;
  }
  
  .form-group {
    margin-bottom: 14px;
  }
  
  .form-group label {
    font-size: 14px;
  }
  
  .form-group input {
    padding: 12px 14px;
    font-size: 16px; /* ป้องกัน zoom บน iOS */
    min-height: 48px;
    border-radius: 8px;
  }
  
  /* รายชื่อที่เลือก */
  .selected-list h4 {
    font-size: 14px;
    margin-bottom: 12px;
  }
  
  .athlete-chips {
    max-height: 150px;
    gap: 10px;
    padding: 6px;
  }
  
  .athlete-chip {
    padding: 8px 12px;
    font-size: 14px;
    border-radius: 20px;
  }
  
  /* ปุ่มลบ chip - touch-friendly */
  .remove-chip {
    min-width: 32px;
    min-height: 32px;
    padding: 6px;
    margin: -4px -6px -4px 4px;
  }
  
  .remove-chip svg {
    width: 16px;
    height: 16px;
  }
  
  /* ผลลัพธ์ */
  .result-container {
    padding: 32px 20px;
  }
  
  .result-icon {
    width: 72px;
    height: 72px;
  }
  
  .result-icon svg {
    width: 36px;
    height: 36px;
  }
  
  .result-container h3 {
    font-size: 20px;
  }
  
  .result-container p {
    font-size: 15px;
  }
  
  /* รายการที่ล้มเหลว */
  .failures-list {
    margin-top: 24px;
  }
  
  .failures-list h4 {
    font-size: 14px;
    margin-bottom: 12px;
  }
  
  .failure-item {
    padding: 10px 14px;
    margin-bottom: 8px;
    border-radius: 8px;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  
  .failure-name {
    font-size: 14px;
  }
  
  .failure-reason {
    font-size: 13px;
  }
  
  /* Modal Actions - full width buttons */
  .modal-actions {
    flex-direction: column-reverse;
    gap: 10px;
  }
  
  .btn-primary,
  .btn-secondary {
    width: 100%;
    min-height: 48px;
    font-size: 15px;
    border-radius: 8px;
  }
  
  .btn-primary {
    min-width: unset;
  }
  
  /* Loading Spinner */
  .loading-spinner {
    width: 18px;
    height: 18px;
  }
}

/* Tablet */
@media (min-width: 641px) and (max-width: 1024px) {
  .bulk-add-content {
    min-height: 350px;
  }
  
  .form-group input {
    min-height: 44px;
  }
  
  .btn-primary,
  .btn-secondary {
    min-height: 44px;
  }
}
</style>
