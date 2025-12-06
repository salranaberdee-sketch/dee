<template>
  <div class="first-time-setup">
    <!-- Step 1: เลือกประเภทกีฬา -->
    <div v-if="currentStep === 1" class="setup-step">
      <h2>1. เลือกประเภทกีฬา</h2>
      <p class="step-desc">เลือกประเภทกีฬาเพื่อโหลดเกณฑ์คะแนนที่เหมาะสม</p>
      
      <!-- Loading State -->
      <div v-if="loadingSportTypes" class="loading">
        <div class="spinner"></div>
        <span>กำลังโหลดประเภทกีฬา...</span>
      </div>
      
      <!-- Empty State -->
      <div v-else-if="displaySportTypes.length === 0" class="empty-state">
        <p>ยังไม่มีประเภทกีฬาในระบบ</p>
        <p class="empty-hint">กรุณาติดต่อผู้ดูแลระบบเพื่อเพิ่มประเภทกีฬา</p>
      </div>
      
      <!-- Sport Cards -->
      <template v-else>
        <div class="sport-cards">
          <button 
            v-for="sport in displaySportTypes" 
            :key="sport.id"
            class="sport-card"
            :class="{ selected: selectedSportType?.id === sport.id }"
            @click="selectSportType(sport)"
          >
            <div class="sport-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 2a10 10 0 0110 10"/>
              </svg>
            </div>
            <span class="sport-name">{{ sport.display_name }}</span>
          </button>
        </div>
        
        <button 
          class="btn-next" 
          :disabled="!selectedSportType"
          @click="goToStep2"
        >
          ถัดไป
        </button>
      </template>
    </div>
    
    <!-- Step 2: ยืนยันเกณฑ์ -->
    <div v-else-if="currentStep === 2" class="setup-step">
      <h2>2. ยืนยันเกณฑ์</h2>
      <p class="step-desc">ตรวจสอบเกณฑ์คะแนนสำหรับ {{ selectedSportType?.display_name }}</p>
      
      <div v-if="loading" class="loading">
        <div class="spinner"></div>
        <span>กำลังโหลด...</span>
      </div>
      
      <div v-else-if="templatePreview" class="template-preview">
        <div class="preview-header">
          <span class="preview-name">{{ templatePreview.name }}</span>
        </div>
        
        <div class="preview-categories">
          <div 
            v-for="cat in templatePreview.template_categories" 
            :key="cat.id"
            class="preview-category"
          >
            <span class="cat-name">{{ cat.display_name }}</span>
            <span class="cat-weight">{{ cat.weight }}%</span>
          </div>
        </div>
      </div>
      
      <div class="step-actions">
        <button class="btn-back" @click="currentStep = 1">
          ย้อนกลับ
        </button>
        <button 
          class="btn-confirm" 
          :disabled="!templatePreview || saving"
          @click="confirmSetup"
        >
          {{ saving ? 'กำลังบันทึก...' : 'ยืนยัน' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useScoringConfigStore } from '@/stores/scoringConfig'
import { useAuthStore } from '@/stores/auth'

const emit = defineEmits(['complete'])

const scoringConfigStore = useScoringConfigStore()
const authStore = useAuthStore()

// State
const currentStep = ref(1)
const selectedSportType = ref(null)
const templatePreview = ref(null)
const loading = ref(false)
const saving = ref(false)
const loadingSportTypes = ref(true)

// จำกัดแค่ 5 ตัวเลือก
const displaySportTypes = computed(() => {
  return scoringConfigStore.sportTypes.slice(0, 5)
})

// Methods
function selectSportType(sport) {
  selectedSportType.value = sport
}

async function goToStep2() {
  if (!selectedSportType.value) return
  
  currentStep.value = 2
  loading.value = true
  
  try {
    // โหลด template สำหรับประเภทกีฬาที่เลือก
    templatePreview.value = await scoringConfigStore.loadTemplateForSportType(
      selectedSportType.value.id
    )
  } catch (err) {
    console.error('Error loading template:', err)
  } finally {
    loading.value = false
  }
}

async function confirmSetup() {
  if (!templatePreview.value || saving.value) return
  
  saving.value = true
  
  try {
    const clubId = authStore.profile?.club_id
    if (!clubId) throw new Error('ไม่พบข้อมูลชมรม')
    
    // Clone template เป็นการตั้งค่าของชมรม
    const result = await scoringConfigStore.cloneTemplateForClub(
      clubId,
      templatePreview.value.id,
      `เกณฑ์ ${selectedSportType.value.display_name}`
    )
    
    if (result.success) {
      emit('complete')
    } else {
      alert(result.error || 'เกิดข้อผิดพลาด')
    }
  } catch (err) {
    console.error('Error confirming setup:', err)
    alert(err.message)
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  // โหลดประเภทกีฬา
  loadingSportTypes.value = true
  try {
    await scoringConfigStore.fetchSportTypes()
  } finally {
    loadingSportTypes.value = false
  }
})
</script>

<style scoped>
.first-time-setup {
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 12px;
  padding: 1.5rem;
}

.setup-step h2 {
  font-size: 1.125rem;
  font-weight: 700;
  color: #171717;
  margin: 0 0 0.5rem;
}

.step-desc {
  font-size: 0.875rem;
  color: #737373;
  margin: 0 0 1.5rem;
}

/* Sport Cards */
.sport-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.sport-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 0.75rem;
  background: #FAFAFA;
  border: 2px solid #E5E5E5;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
}

.sport-card:hover {
  border-color: #A3A3A3;
}

.sport-card.selected {
  border-color: #171717;
  background: #F5F5F5;
}

.sport-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #171717;
  border-radius: 8px;
}

.sport-icon svg {
  width: 20px;
  height: 20px;
  color: #fff;
}

.sport-name {
  font-size: 0.8rem;
  font-weight: 500;
  color: #171717;
  text-align: center;
}

/* Buttons */
.btn-next,
.btn-confirm {
  width: 100%;
  padding: 0.75rem;
  background: #171717;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
}

.btn-next:disabled,
.btn-confirm:disabled {
  background: #A3A3A3;
  cursor: not-allowed;
}

.btn-back {
  padding: 0.75rem 1.5rem;
  background: #fff;
  color: #525252;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  font-size: 0.875rem;
  cursor: pointer;
}

.step-actions {
  display: flex;
  gap: 0.75rem;
}

.step-actions .btn-confirm {
  flex: 1;
}

/* Loading */
.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 2rem;
  color: #737373;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid #E5E5E5;
  border-top-color: #171717;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Template Preview */
.template-preview {
  background: #FAFAFA;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
}

.preview-header {
  margin-bottom: 0.75rem;
}

.preview-name {
  font-weight: 600;
  color: #171717;
}

.preview-categories {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.preview-category {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem;
  background: #fff;
  border-radius: 4px;
}

.cat-name {
  font-size: 0.875rem;
  color: #525252;
}

.cat-weight {
  font-size: 0.875rem;
  font-weight: 600;
  color: #171717;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 2rem;
  color: #737373;
}

.empty-state p {
  margin: 0 0 0.5rem;
}

.empty-hint {
  font-size: 0.8rem;
  color: #A3A3A3;
}

/* Responsive */
@media (max-width: 640px) {
  .first-time-setup {
    padding: 1rem;
  }
  
  .sport-cards {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
