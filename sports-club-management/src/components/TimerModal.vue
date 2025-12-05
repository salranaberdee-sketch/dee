<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  show: Boolean,
  isCoach: Boolean,
  isAdmin: Boolean,
  athletes: Array,
  activityCategories: Array
})

const emit = defineEmits(['close', 'save'])

// Constants
const TIMER_STORAGE_KEY = 'training_timer_state'
const MAX_TIMER_DURATION = 86400 // 24 ชั่วโมง (วินาที)

// State
const step = ref('timer') // 'select-athlete' | 'timer' | 'save'
const selectedCategory = ref(null)
const selectedAthlete = ref(null)
const startTime = ref(0) // timestamp
const pausedDuration = ref(0) // milliseconds
const elapsedSeconds = ref(0)
const isRunning = ref(false)
const isPaused = ref(false)
const timerInterval = ref(null)
const wasRestored = ref(false)
const wakeLock = ref(null)
const categoryPillsRef = ref(null)

// Save form
const saveForm = ref({
  activities: '',
  notes: '',
  custom_activity: ''
})

// Computed
const formattedTime = computed(() => {
  const hours = Math.floor(elapsedSeconds.value / 3600)
  const minutes = Math.floor((elapsedSeconds.value % 3600) / 60)
  const secs = elapsedSeconds.value % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
})

const durationInMinutes = computed(() => {
  return Math.round(elapsedSeconds.value / 60)
})

const otherCategory = computed(() => {
  return props.activityCategories?.find(c => c.name === 'อื่นๆ')
})

const isOtherCategorySelected = computed(() => {
  return selectedCategory.value && otherCategory.value && selectedCategory.value === otherCategory.value.id
})

const canStartTimer = computed(() => {
  // Option 1: ไม่ต้องเลือก category ก่อนเริ่ม
  if (props.isCoach || props.isAdmin) {
    return selectedAthlete.value
  }
  return true
})

// LocalStorage Functions
function saveTimerState() {
  const state = {
    isRunning: isRunning.value,
    isPaused: isPaused.value,
    startTime: startTime.value,
    pausedDuration: pausedDuration.value,
    selectedCategory: selectedCategory.value,
    selectedAthlete: selectedAthlete.value,
    step: step.value,
    savedAt: Date.now()
  }
  localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(state))
}

function restoreTimerState() {
  try {
    const saved = localStorage.getItem(TIMER_STORAGE_KEY)
    if (!saved) return false
    
    const state = JSON.parse(saved)
    
    // ตรวจสอบว่าไม่เก่าเกิน 24 ชั่วโมง
    const age = Date.now() - state.savedAt
    if (age > 86400000) {
      clearTimerState()
      return false
    }
    
    // Restore state
    isRunning.value = state.isRunning
    isPaused.value = state.isPaused
    startTime.value = state.startTime
    pausedDuration.value = state.pausedDuration
    selectedCategory.value = state.selectedCategory
    selectedAthlete.value = state.selectedAthlete
    step.value = state.step
    wasRestored.value = true
    
    // ถ้า timer กำลังทำงาน ให้เริ่มใหม่
    if (state.isRunning && !state.isPaused) {
      startTimerFromRestored()
    }
    
    return true
  } catch (err) {
    console.error('Failed to restore timer state:', err)
    clearTimerState()
    return false
  }
}

function clearTimerState() {
  localStorage.removeItem(TIMER_STORAGE_KEY)
}

// Wake Lock Functions
async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      wakeLock.value = await navigator.wakeLock.request('screen')
      console.log('Wake Lock active')
      
      wakeLock.value.addEventListener('release', () => {
        console.log('Wake Lock released')
      })
    }
  } catch (err) {
    console.warn('Wake Lock not supported or denied:', err)
  }
}

async function releaseWakeLock() {
  if (wakeLock.value) {
    try {
      await wakeLock.value.release()
      wakeLock.value = null
    } catch (err) {
      console.warn('Failed to release wake lock:', err)
    }
  }
}

// Timer Functions
function startTimer() {
  if (!canStartTimer.value) return
  
  isRunning.value = true
  isPaused.value = false
  startTime.value = Date.now() - pausedDuration.value
  step.value = 'timer'
  
  timerInterval.value = setInterval(() => {
    elapsedSeconds.value = Math.floor((Date.now() - startTime.value) / 1000)
    
    // จำกัดเวลาสูงสุด 24 ชั่วโมง
    if (elapsedSeconds.value >= MAX_TIMER_DURATION) {
      stopTimer()
    }
  }, 100)
  
  requestWakeLock()
  saveTimerState()
}

function startTimerFromRestored() {
  // เริ่ม timer จาก restored state
  timerInterval.value = setInterval(() => {
    elapsedSeconds.value = Math.floor((Date.now() - startTime.value) / 1000)
    
    if (elapsedSeconds.value >= MAX_TIMER_DURATION) {
      stopTimer()
    }
  }, 100)
  
  requestWakeLock()
}

function pauseTimer() {
  isPaused.value = true
  pausedDuration.value = Date.now() - startTime.value
  clearInterval(timerInterval.value)
  releaseWakeLock()
  saveTimerState()
}

function resumeTimer() {
  isPaused.value = false
  startTime.value = Date.now() - pausedDuration.value
  
  timerInterval.value = setInterval(() => {
    elapsedSeconds.value = Math.floor((Date.now() - startTime.value) / 1000)
    
    if (elapsedSeconds.value >= MAX_TIMER_DURATION) {
      stopTimer()
    }
  }, 100)
  
  requestWakeLock()
  saveTimerState()
}

function stopTimer() {
  isRunning.value = false
  clearInterval(timerInterval.value)
  releaseWakeLock()
  step.value = 'save'
  saveTimerState()
}

function cancelTimer() {
  clearTimerState()
  releaseWakeLock()
  resetState()
  emit('close')
}

function resetState() {
  step.value = 'timer'
  selectedCategory.value = null
  selectedAthlete.value = null
  startTime.value = 0
  pausedDuration.value = 0
  elapsedSeconds.value = 0
  isRunning.value = false
  isPaused.value = false
  wasRestored.value = false
  clearInterval(timerInterval.value)
  saveForm.value = {
    activities: '',
    notes: '',
    custom_activity: ''
  }
}

function handleSave() {
  // Validation
  if (!selectedCategory.value) {
    alert('กรุณาเลือกหมวดหมู่กิจกรรม')
    return
  }
  
  if (!saveForm.value.activities.trim()) {
    alert('กรุณากรอกกิจกรรมที่ฝึก')
    return
  }
  
  if (durationInMinutes.value === 0) {
    alert('ระยะเวลาต้องมากกว่า 0 นาที')
    return
  }
  
  // สร้าง log object
  const logData = {
    athlete_id: selectedAthlete.value,
    date: new Date().toISOString().split('T')[0],
    duration: durationInMinutes.value,
    activities: saveForm.value.activities,
    notes: saveForm.value.notes,
    category_id: selectedCategory.value,
    custom_activity: isOtherCategorySelected.value ? saveForm.value.custom_activity : null
  }
  
  clearTimerState()
  emit('save', logData)
  resetState()
}

// Visibility Change Handler
function handleVisibilityChange() {
  if (document.visibilityState === 'visible') {
    // Tab กลับมา active
    if (isRunning.value && !isPaused.value) {
      // อัพเดทเวลาทันที
      elapsedSeconds.value = Math.floor((Date.now() - startTime.value) / 1000)
    }
  } else {
    // Tab ไม่ active - บันทึก state
    if (isRunning.value || isPaused.value) {
      saveTimerState()
    }
  }
}

// Before Unload Handler
function handleBeforeUnload(e) {
  if (isRunning.value || isPaused.value) {
    // บันทึก state
    saveTimerState()
    
    // แสดงคำเตือน
    e.preventDefault()
    e.returnValue = 'คุณมี timer ที่กำลังทำงานอยู่ ต้องการออกจากหน้านี้หรือไม่?'
    return e.returnValue
  }
}

// Category Slider Functions (ไม่ใช้แล้ว - ใช้ snap scroll แทน)

// Lifecycle
watch(() => props.show, (newVal) => {
  if (newVal) {
    // เมื่อเปิด modal พยายาม restore state
    const restored = restoreTimerState()
    
    // ถ้าไม่มี state หรือ restore ไม่สำเร็จ ให้เริ่ม timer ใหม่
    if (!restored && canStartTimer.value) {
      // Option 1: เริ่ม timer ทันทีเมื่อเปิด modal
      if (props.isCoach || props.isAdmin) {
        // Coach/Admin ต้องเลือก athlete ก่อน
        step.value = 'select-athlete'
      } else {
        // Athlete เริ่มได้เลย
        startTimer()
      }
    }
  } else {
    // เมื่อปิด modal
    if (!isRunning.value && !isPaused.value) {
      resetState()
    }
  }
})

// Auto-save state เมื่อมีการเปลี่ยนแปลง
watch([isRunning, isPaused, startTime, pausedDuration, selectedCategory], () => {
  if (isRunning.value || isPaused.value) {
    saveTimerState()
  }
})

onMounted(() => {
  document.addEventListener('visibilitychange', handleVisibilityChange)
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onUnmounted(() => {
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  window.removeEventListener('beforeunload', handleBeforeUnload)
  releaseWakeLock()
  clearInterval(timerInterval.value)
})
</script>

<template>
  <div v-if="show" class="modal-overlay" @click.self="cancelTimer">
    <div class="modal-content timer-modal">
      <div class="modal-header">
        <h2 class="modal-title">จับเวลาการฝึกซ้อม</h2>
        <button class="modal-close" @click="cancelTimer">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div class="modal-body">
        <!-- Step 1: เลือกนักกีฬา (Coach/Admin only) -->
        <div v-if="step === 'select-athlete'" class="step-content">
          <div class="form-group">
            <label>เลือกนักกีฬา</label>
            <select v-model="selectedAthlete" class="form-control" required>
              <option :value="null" disabled>เลือกนักกีฬา</option>
              <option v-for="athlete in athletes" :key="athlete.id" :value="athlete.id">
                {{ athlete.name }}
              </option>
            </select>
          </div>

          <button 
            class="btn btn-primary btn-block" 
            :disabled="!selectedAthlete"
            @click="startTimer"
          >
            เริ่มจับเวลา
          </button>
        </div>

        <!-- Step 2: จับเวลา (Option 1: Quick Start) -->
        <div v-if="step === 'timer'" class="step-content timer-display">
          <!-- Restored Session Indicator -->
          <div v-if="wasRestored" class="restored-indicator">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
            <span>กลับมาต่อจากครั้งก่อน</span>
          </div>

          <!-- Hero Timer Display -->
          <div class="timer-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          
          <div class="timer-time">{{ formattedTime }}</div>
          
          <!-- Category Pills (Swipe Slider) -->
          <div class="category-section">
            <label class="category-label">ปัดเพื่อเลือกหมวดหมู่</label>
            <div class="category-slider-wrapper">
              <div class="category-pills" ref="categoryPillsRef">
                <button
                  v-for="cat in activityCategories"
                  :key="cat.id"
                  type="button"
                  :class="['category-pill', { active: selectedCategory === cat.id }]"
                  @click="selectedCategory = cat.id"
                >
                  {{ cat.name }}
                </button>
              </div>
            </div>
            <div class="swipe-hint">← ปัดซ้าย/ขวา →</div>
          </div>
          
          <!-- Timer Controls -->
          <div class="timer-controls">
            <button 
              v-if="!isPaused" 
              class="btn btn-secondary"
              @click="pauseTimer"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
              </svg>
              หยุดชั่วคราว
            </button>
            <button 
              v-else 
              class="btn btn-secondary"
              @click="resumeTimer"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              ดำเนินการต่อ
            </button>
            <button class="btn btn-primary" @click="stopTimer">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              </svg>
              จบการฝึก
            </button>
          </div>
          
          <!-- Wake Lock Indicator -->
          <div v-if="isRunning && wakeLock" class="wake-lock-indicator">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="5" y="11" width="14" height="10" rx="2" ry="2"/><path d="M12 11V7a3 3 0 0 1 6 0v4"/>
            </svg>
            <span>หน้าจอจะไม่ดับ</span>
          </div>
          
          <button class="btn btn-danger btn-sm" @click="cancelTimer">
            ยกเลิก
          </button>
        </div>

        <!-- Step 3: บันทึกรายละเอียด -->
        <div v-if="step === 'save'" class="step-content">
          <div class="form-group">
            <label>ระยะเวลา</label>
            <input 
              :value="`${durationInMinutes} นาที`" 
              class="form-control" 
              disabled 
            />
          </div>

          <div class="form-group">
            <label>หมวดหมู่กิจกรรม *</label>
            <select v-model="selectedCategory" class="form-control" required>
              <option :value="null" disabled>เลือกหมวดหมู่</option>
              <option v-for="cat in activityCategories" :key="cat.id" :value="cat.id">
                {{ cat.name }}
              </option>
            </select>
          </div>

          <div v-if="isOtherCategorySelected" class="form-group">
            <label>ระบุกิจกรรม (อื่นๆ)</label>
            <input 
              v-model="saveForm.custom_activity" 
              class="form-control" 
              placeholder="ระบุกิจกรรมที่ฝึก"
            />
          </div>

          <div class="form-group">
            <label>กิจกรรมที่ฝึก *</label>
            <input 
              v-model="saveForm.activities" 
              class="form-control" 
              placeholder="เช่น วิ่ง 5 กม." 
              required 
            />
          </div>

          <div class="form-group">
            <label>บันทึกเพิ่มเติม</label>
            <textarea 
              v-model="saveForm.notes" 
              class="form-control" 
              rows="3" 
              placeholder="สภาพร่างกาย, ความรู้สึก"
            ></textarea>
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" @click="cancelTimer">ยกเลิก</button>
            <button class="btn btn-primary" @click="handleSave">บันทึก</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Modal Overlay - ปรับให้เป็น popup สวยงาม */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.timer-modal {
  max-width: 480px;
  width: 100%;
  background: var(--white);
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: modalSlideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes modalSlideUp {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-header {
  padding: 24px 24px 16px;
  border-bottom: 2px solid var(--gray-100);
}

.modal-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--gray-900);
  margin: 0;
}

.modal-close {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 36px;
  height: 36px;
  border: none;
  background: var(--gray-100);
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.modal-close:hover {
  background: var(--gray-900);
  transform: rotate(90deg);
}

.modal-close:hover svg {
  color: var(--white);
}

.modal-close svg {
  width: 18px;
  height: 18px;
  color: var(--gray-600);
  transition: color 0.2s;
}

.modal-body {
  padding: 24px;
}

.step-content {
  padding: 0;
}

/* Restored Session Indicator */
.restored-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  background: var(--gray-900);
  color: var(--white);
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 24px;
  animation: fadeIn 0.3s;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.restored-indicator svg {
  width: 18px;
  height: 18px;
}

/* Category Section - Slider สวยงาม */
.category-section {
  margin: 28px 0;
  padding: 20px;
  background: var(--gray-50);
  border-radius: 16px;
  border: 1px solid var(--gray-100);
}

.category-label {
  display: block;
  font-size: 11px;
  font-weight: 700;
  color: var(--gray-500);
  margin-bottom: 14px;
  text-transform: uppercase;
  letter-spacing: 1px;
  text-align: center;
}

.swipe-hint {
  text-align: center;
  font-size: 11px;
  font-weight: 600;
  color: var(--gray-400);
  margin-top: 8px;
  letter-spacing: 0.5px;
}

.category-slider-wrapper {
  position: relative;
  width: 100%;
  overflow: hidden;
}

.category-pills {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 8px 4px 16px;
  scroll-behavior: smooth;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
  scroll-snap-type: x mandatory;
}

.category-pills::-webkit-scrollbar {
  display: none;
}

.category-pill {
  flex-shrink: 0;
  min-width: 140px;
  padding: 14px 28px;
  background: var(--white);
  border: 3px solid var(--gray-900);
  border-radius: 40px;
  font-size: 15px;
  font-weight: 700;
  color: var(--gray-900);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
  text-align: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  scroll-snap-align: center;
  scroll-snap-stop: always;
}

.category-pill:hover {
  background: var(--gray-900);
  color: var(--white);
  transform: scale(1.05);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
}

.category-pill.active {
  background: var(--gray-900);
  color: var(--white);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
  transform: scale(1.08);
}

/* Timer Display - Hero Style ขาวดำสวยงาม */
.timer-display {
  text-align: center;
  padding: 20px 0;
}

.timer-icon {
  width: 120px;
  height: 120px;
  margin: 0 auto 28px;
  background: var(--gray-900);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
  animation: pulse 2s ease-in-out infinite;
  position: relative;
}

.timer-icon::before {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 2px solid var(--gray-900);
  opacity: 0.3;
}

@keyframes pulse {
  0%, 100% {
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
    transform: scale(1);
  }
  50% {
    box-shadow: 0 16px 50px rgba(0, 0, 0, 0.4);
    transform: scale(1.02);
  }
}

.timer-icon svg {
  width: 56px;
  height: 56px;
  color: var(--white);
}

.timer-time {
  font-size: 72px;
  font-weight: 900;
  color: var(--gray-900);
  margin-bottom: 20px;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
  line-height: 1;
  text-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.timer-controls {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 36px;
  margin-bottom: 24px;
}

.timer-controls .btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-width: 160px;
  padding: 16px 28px;
  font-size: 15px;
  font-weight: 700;
  border-radius: 50px;
  border: 3px solid var(--gray-900);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.timer-controls .btn svg {
  width: 20px;
  height: 20px;
}

.timer-controls .btn-primary {
  background: var(--gray-900);
  color: var(--white);
}

.timer-controls .btn-primary:hover {
  background: var(--black);
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
}

.timer-controls .btn-secondary {
  background: var(--white);
  color: var(--gray-900);
}

.timer-controls .btn-secondary:hover {
  background: var(--gray-900);
  color: var(--white);
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
}

.timer-controls .btn:active {
  transform: translateY(-1px);
}

/* Wake Lock Indicator - ขาวดำสวยงาม */
.wake-lock-indicator {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 20px;
  background: var(--gray-900);
  color: var(--white);
  border-radius: 30px;
  font-size: 12px;
  font-weight: 600;
  margin-top: 20px;
  margin-bottom: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.wake-lock-indicator svg {
  width: 16px;
  height: 16px;
}

.btn-block {
  width: 100%;
  padding: 16px 24px;
  font-size: 16px;
  font-weight: 700;
  border-radius: 50px;
  border: 3px solid var(--gray-900);
  background: var(--gray-900);
  color: var(--white);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.btn-block:hover:not(:disabled) {
  background: var(--black);
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

.btn-block:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
}

/* Form improvements - ขาวดำสวยงาม */
.form-group {
  margin-bottom: 24px;
}

.form-group label {
  display: block;
  font-size: 12px;
  font-weight: 700;
  color: var(--gray-900);
  margin-bottom: 10px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.form-control {
  width: 100%;
  padding: 14px 18px;
  border: 2px solid var(--gray-900);
  border-radius: 12px;
  font-size: 15px;
  font-weight: 500;
  transition: all 0.2s;
  background: var(--white);
}

.form-control:focus {
  outline: none;
  border-color: var(--black);
  box-shadow: 0 0 0 4px rgba(0, 0, 0, 0.08);
}

.form-control:disabled {
  background: var(--gray-100);
  color: var(--gray-600);
  cursor: not-allowed;
  border-color: var(--gray-300);
}

/* Buttons - ขาวดำสวยงาม */
.btn {
  cursor: pointer;
  border: none;
  font-family: inherit;
}

.btn-primary {
  background: var(--gray-900);
  color: var(--white);
}

.btn-secondary {
  background: var(--white);
  color: var(--gray-900);
  border: 2px solid var(--gray-900);
}

.btn-danger {
  background: var(--white);
  color: var(--gray-900);
  border: 2px solid var(--gray-900);
  padding: 12px 32px;
  font-size: 14px;
  font-weight: 700;
  border-radius: 30px;
  margin-top: 8px;
  transition: all 0.25s;
}

.btn-danger:hover {
  background: var(--gray-900);
  color: var(--white);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
}

.btn-sm {
  padding: 10px 28px;
  font-size: 13px;
}

/* Modal footer - ขาวดำสวยงาม */
.modal-footer {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 32px;
  padding-top: 24px;
  border-top: 2px solid var(--gray-100);
}

.modal-footer .btn {
  min-width: 120px;
  padding: 14px 28px;
  font-size: 15px;
  font-weight: 700;
  border-radius: 30px;
  transition: all 0.25s;
}

.modal-footer .btn-primary {
  border: 3px solid var(--gray-900);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.modal-footer .btn-primary:hover {
  background: var(--black);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
}

.modal-footer .btn-secondary {
  border: 2px solid var(--gray-900);
}

.modal-footer .btn-secondary:hover {
  background: var(--gray-900);
  color: var(--white);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
}
</style>
