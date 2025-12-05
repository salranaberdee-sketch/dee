# Design Document: Training Timer Enhancement

## Overview

ปรับปรุงระบบบันทึกการฝึกซ้อมให้มีระบบจับเวลาจริง (Stopwatch) พร้อมลดความซับซ้อนของ UI เพื่อให้ Athlete สามารถบันทึกเวลาการฝึกได้แม่นยำและใช้งานง่ายขึ้น

## Architecture

### Component Structure

```
TrainingLogs.vue (Main View)
├── TimerModal.vue (NEW - Timer Interface)
│   ├── CategorySelector
│   ├── Stopwatch Display
│   ├── Control Buttons (Start/Pause/Resume/Stop)
│   └── SaveForm (when stopped)
├── ManualEntryModal.vue (Existing Modal - Renamed)
├── GoalSettingsModal.vue (Existing Modal - Simplified)
├── StatsSection (Collapsible)
└── LogsList
```

### State Management

**TrainingLogs.vue State:**
```javascript
// Timer state
const showTimerModal = ref(false)
const timerRunning = ref(false)
const timerPaused = ref(false)
const elapsedSeconds = ref(0)
const timerInterval = ref(null)
const selectedCategory = ref(null)
const selectedAthlete = ref(null) // For Coach/Admin

// Existing state
const showManualModal = ref(false)
const showGoalModal = ref(false)
const editingId = ref(null)
const selectedCategoryFilter = ref(null)
const showStats = ref(false)
```

## Components and Interfaces

### 1. TimerModal Component (Option 1: Quick Start First)

**UX Flow:**
1. Click "เริ่มฝึก" → Timer starts immediately (no category selection required)
2. During training → Floating category pills appear for quick selection
3. Click "จบการฝึก" → Save form with category selection (if not selected during training)

**Props:**
```typescript
interface TimerModalProps {
  show: boolean
  isCoach: boolean
  isAdmin: boolean
  athletes: Athlete[]
  activityCategories: ActivityCategory[]
}
```

**Emits:**
```typescript
interface TimerModalEmits {
  close: () => void
  save: (log: TrainingLog) => void
}
```

**Internal State:**
```javascript
const step = ref<'select-athlete' | 'timer' | 'save'>('timer') // เริ่มที่ timer เลย
const startTime = ref(0) // timestamp สำหรับคำนวณเวลา
const pausedDuration = ref(0) // เวลาที่หยุดไว้ (milliseconds)
const elapsedSeconds = ref(0)
const isRunning = ref(false)
const isPaused = ref(false)
const selectedCategory = ref(null) // เลือกได้ระหว่างจับเวลา
const selectedAthlete = ref(null)
const wasRestored = ref(false) // แสดง indicator ว่า restore จาก localStorage
const wakeLock = ref(null) // Screen Wake Lock
const saveForm = ref({
  activities: '',
  notes: '',
  custom_activity: ''
})
```

### 2. Timer Logic

**Stopwatch Functions:**
```javascript
// เริ่มจับเวลา
function startTimer() {
  isRunning.value = true
  isPaused.value = false
  startTime.value = Date.now() - (elapsedSeconds.value * 1000)
  
  timerInterval.value = setInterval(() => {
    elapsedSeconds.value = Math.floor((Date.now() - startTime.value) / 1000)
  }, 100) // อัพเดททุก 100ms เพื่อความแม่นยำ
}

// หยุดชั่วคราว
function pauseTimer() {
  isPaused.value = true
  clearInterval(timerInterval.value)
}

// ดำเนินการต่อ
function resumeTimer() {
  isPaused.value = false
  startTime.value = Date.now() - (elapsedSeconds.value * 1000)
  
  timerInterval.value = setInterval(() => {
    elapsedSeconds.value = Math.floor((Date.now() - startTime.value) / 1000)
  }, 100)
}

// จบการฝึก
function stopTimer() {
  isRunning.value = false
  clearInterval(timerInterval.value)
  // เปิดฟอร์มบันทึก
  step.value = 'save'
}

// ยกเลิก
function cancelTimer() {
  isRunning.value = false
  isPaused.value = false
  elapsedSeconds.value = 0
  clearInterval(timerInterval.value)
  emit('close')
}

// แปลงวินาทีเป็น HH:MM:SS
function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

// แปลงวินาทีเป็นนาที (สำหรับบันทึก)
function secondsToMinutes(seconds) {
  return Math.round(seconds / 60)
}
```

## Data Models

### Training Log (Existing - No Changes)

```typescript
interface TrainingLog {
  id: string
  athlete_id: string
  coach_id: string | null
  club_id: string | null
  date: string // YYYY-MM-DD
  duration: number // minutes
  activities: string
  notes: string
  category_id: string | null
  custom_activity: string | null
  created_at: timestamp
  updated_at: timestamp
}
```

### Timer Session (New - Frontend Only)

```typescript
interface TimerSession {
  startTime: number // timestamp
  elapsedSeconds: number
  isRunning: boolean
  isPaused: boolean
  category_id: string | null
  athlete_id: string | null // For Coach/Admin
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Timer accuracy

*For any* timer session, the elapsed time displayed should match the actual time passed within 1 second tolerance
**Validates: Requirements 1.3**

### Property 2: Timer state consistency

*For any* timer session, when paused and resumed, the total elapsed time should equal the sum of all running periods
**Validates: Requirements 1.4, 1.5**

### Property 3: Duration conversion

*For any* completed timer session, converting elapsed seconds to minutes and back should preserve the duration within 1 minute tolerance
**Validates: Requirements 2.2**

### Property 4: Manual entry equivalence

*For any* training log, whether created via timer or manual entry, the stored data structure should be identical
**Validates: Requirements 3.4**

### Property 5: Filter consistency

*For any* category filter applied, all displayed logs should belong to the selected category
**Validates: Requirements 7.1, 7.4**

### Property 6: Role-based athlete access

*For any* Coach user, the available athletes list should only include athletes from the Coach's club
**Validates: Requirements 6.3**

## Error Handling

### Timer Errors

1. **Browser Tab Inactive**: ใช้ `Date.now()` แทน `setInterval` counter เพื่อป้องกันเวลาผิดพลาดเมื่อ tab ไม่ active
2. **Timer Overflow**: จำกัดเวลาสูงสุดที่ 24 ชั่วโมง (86400 วินาที)
3. **Network Loss During Save**: แสดง error message และเก็บข้อมูลไว้ใน form ให้ลองบันทึกใหม่

### Validation Errors

1. **Missing Category**: แสดง error "กรุณาเลือกหมวดหมู่กิจกรรม"
2. **Missing Activity**: แสดง error "กรุณากรอกกิจกรรมที่ฝึก"
3. **Invalid Duration**: แสดง error "ระยะเวลาต้องมากกว่า 0 นาที"
4. **Missing Athlete (Coach/Admin)**: แสดง error "กรุณาเลือกนักกีฬา"

## Background Timer & State Persistence

### Requirements 9 & 10 Implementation

#### 1. Background Timer Strategy

**Problem:** `setInterval` หยุดทำงานเมื่อ:
- หน้าจอถูกล็อค
- แท็บไม่ active
- แอปอยู่เบื้องหลัง

**Solution:** ใช้ `Date.now()` เป็นแหล่งความจริง (Source of Truth)

```javascript
// เก็บเวลาเริ่มต้นแทนการนับวินาที
const startTime = ref(0)
const pausedDuration = ref(0)

function startTimer() {
  startTime.value = Date.now() - pausedDuration.value
  
  timerInterval.value = setInterval(() => {
    // คำนวณจาก Date.now() ทุกครั้ง
    elapsedSeconds.value = Math.floor((Date.now() - startTime.value) / 1000)
  }, 100)
}

function pauseTimer() {
  pausedDuration.value = Date.now() - startTime.value
  clearInterval(timerInterval.value)
}

function resumeTimer() {
  startTime.value = Date.now() - pausedDuration.value
  // ต่อจากเวลาที่หยุดไว้
}
```

#### 2. State Persistence (LocalStorage)

**Timer State Schema:**
```typescript
interface TimerState {
  isRunning: boolean
  isPaused: boolean
  startTime: number // timestamp
  pausedDuration: number // milliseconds
  selectedCategory: string
  selectedAthlete: string | null
  step: 'select-category' | 'timer' | 'save'
  savedAt: number // timestamp
}
```

**Persistence Functions:**
```javascript
const TIMER_STORAGE_KEY = 'training_timer_state'

// บันทึก state
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

// โหลด state
function restoreTimerState() {
  const saved = localStorage.getItem(TIMER_STORAGE_KEY)
  if (!saved) return false
  
  const state = JSON.parse(saved)
  
  // ตรวจสอบว่าไม่เก่าเกิน 24 ชั่วโมง
  const age = Date.now() - state.savedAt
  if (age > 86400000) { // 24 hours
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
  
  // ถ้า timer กำลังทำงาน ให้เริ่มใหม่
  if (state.isRunning && !state.isPaused) {
    startTimer()
  }
  
  return true
}

// ลบ state
function clearTimerState() {
  localStorage.removeItem(TIMER_STORAGE_KEY)
}
```

**Lifecycle Integration:**
```javascript
// ใน TimerModal.vue
onMounted(() => {
  // พยายาม restore state เมื่อเปิด modal
  if (props.show) {
    restoreTimerState()
  }
})

// บันทึก state ทุกครั้งที่มีการเปลี่ยนแปลง
watch([isRunning, isPaused, startTime, pausedDuration], () => {
  if (isRunning.value || isPaused.value) {
    saveTimerState()
  }
})

// ลบ state เมื่อบันทึกสำเร็จหรือยกเลิก
function handleSave() {
  // ... save logic ...
  clearTimerState()
}

function cancelTimer() {
  clearTimerState()
  resetState()
  emit('close')
}
```

#### 3. Screen Wake Lock API

**Wake Lock Implementation:**
```javascript
let wakeLock = null

async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen')
      console.log('Wake Lock active')
      
      // จัดการเมื่อ wake lock ถูกปล่อย
      wakeLock.addEventListener('release', () => {
        console.log('Wake Lock released')
      })
    }
  } catch (err) {
    console.warn('Wake Lock not supported or denied:', err)
  }
}

async function releaseWakeLock() {
  if (wakeLock) {
    await wakeLock.release()
    wakeLock = null
  }
}

// เรียกใช้เมื่อเริ่ม timer
function startTimer() {
  // ... existing logic ...
  requestWakeLock()
}

// ปล่อยเมื่อหยุดหรือยกเลิก
function stopTimer() {
  // ... existing logic ...
  releaseWakeLock()
}

function cancelTimer() {
  // ... existing logic ...
  releaseWakeLock()
}

// ปล่อยเมื่อ component ถูก unmount
onUnmounted(() => {
  releaseWakeLock()
  clearInterval(timerInterval.value)
})
```

#### 4. Visibility Change Handling

**Handle Tab/Window Visibility:**
```javascript
// ตรวจจับเมื่อ tab กลับมา active
onMounted(() => {
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onUnmounted(() => {
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})

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
```

#### 5. Page Unload Handling

**Save State Before Close:**
```javascript
onMounted(() => {
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onUnmounted(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
})

function handleBeforeUnload(e) {
  if (isRunning.value || isPaused.value) {
    // บันทึก state
    saveTimerState()
    
    // แสดงคำเตือน (บางบราวเซอร์อาจไม่แสดง)
    e.preventDefault()
    e.returnValue = 'คุณมี timer ที่กำลังทำงานอยู่ ต้องการออกจากหน้านี้หรือไม่?'
    return e.returnValue
  }
}
```

#### 6. UI Indicators

**Wake Lock Indicator:**
```vue
<template>
  <div v-if="isRunning && wakeLock" class="wake-lock-indicator">
    <svg><!-- screen icon --></svg>
    <span>หน้าจอจะไม่ดับ</span>
  </div>
</template>

<style>
.wake-lock-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--gray-100);
  border-radius: 8px;
  font-size: 12px;
  color: var(--gray-600);
  margin-top: 12px;
}
</style>
```

**Restored Session Indicator:**
```vue
<template>
  <div v-if="wasRestored" class="restored-indicator">
    <svg><!-- info icon --></svg>
    <span>กลับมาต่อจากครั้งก่อน</span>
  </div>
</template>
```

### Edge Cases & Limitations

1. **Wake Lock Limitations:**
   - ไม่รองรับใน iOS Safari (ต้องใช้ workaround)
   - ต้องมี user interaction ก่อน (ไม่สามารถเรียกอัตโนมัติ)
   - อาจถูกปล่อยโดยระบบเมื่อแบตเตอรี่ต่ำ

2. **LocalStorage Limitations:**
   - ข้อมูลอาจถูกลบโดย browser (incognito mode, storage full)
   - ต้องตรวจสอบ quota และ handle errors

3. **Background Timer Accuracy:**
   - Mobile browsers อาจ throttle timers เมื่อ background
   - ใช้ `Date.now()` แก้ปัญหานี้

4. **Multiple Tabs:**
   - ถ้าเปิดหลาย tabs อาจมี timer ซ้อนกัน
   - ใช้ BroadcastChannel หรือ SharedWorker ถ้าต้องการ sync

## Testing Strategy

### Unit Tests

1. **Timer Functions**
   - Test `startTimer()` initializes correctly
   - Test `pauseTimer()` stops interval
   - Test `resumeTimer()` continues from paused time
   - Test `stopTimer()` clears interval and opens save form
   - Test `formatTime()` converts seconds to HH:MM:SS correctly
   - Test `secondsToMinutes()` rounds correctly

2. **Form Validation**
   - Test required fields validation
   - Test category selection
   - Test athlete selection (Coach/Admin)

3. **Filter Logic**
   - Test category filter applies correctly
   - Test filter clear resets to all logs
   - Test statistics recalculate with filter

### Integration Tests

1. **Complete Timer Flow**
   - Start timer → Pause → Resume → Stop → Save
   - Verify log is created with correct duration

2. **Manual Entry Flow**
   - Open manual form → Fill data → Save
   - Verify log is created identically to timer entry

3. **Role-Based Access**
   - Test Athlete can only see own logs
   - Test Coach sees only club athletes
   - Test Admin sees all athletes

## UI/UX Design

### Timer Modal Layout (Option 1: Quick Start First)

```
┌─────────────────────────────────────┐
│  จับเวลาการฝึกซ้อม              ✕  │
├─────────────────────────────────────┤
│  [Step 1: กำลังจับเวลา]            │
│                                     │
│         ⏱️                          │
│       00:15:30                      │
│                                     │
│  หมวดหมู่: [วิ่ง ▼]  (optional)    │
│                                     │
│  ○ วิ่ง  ○ ว่ายน้ำ  ○ ยิมนาสติก   │
│  (horizontal scroll pills)          │
│                                     │
│  [หยุดชั่วคราว]  [จบการฝึก]        │
│                                     │
│  [ยกเลิก]                           │
│                                     │
├─────────────────────────────────────┤
│  [Step 2: บันทึกรายละเอียด]        │
│                                     │
│  เวลา: 15 นาที (อัตโนมัติ)         │
│  หมวดหมู่: [เลือก ▼] (required)    │
│  กิจกรรม: [____________]            │
│  หมายเหตุ: [____________]           │
│                                     │
│  [ยกเลิก]  [บันทึก]                │
│                                     │
└─────────────────────────────────────┘
```

**Key Changes:**
- Timer starts immediately when modal opens
- Category pills shown during training (horizontal scroll)
- Category selection optional during training, required at save
- Large hero timer display (64px font)
- Floating action buttons for pause/stop

### Button States

**Primary Actions:**
- "เริ่มฝึก" - ปุ่มหลัก (ดำ, ขาว text)
- "เริ่มจับเวลา" - เริ่มนับเวลา (ดำ, ขาว text)
- "จบการฝึก" - หยุดและบันทึก (ดำ, ขาว text)

**Secondary Actions:**
- "หยุดชั่วคราว" - Pause (ขาว, ดำ text, border)
- "ดำเนินการต่อ" - Resume (ขาว, ดำ text, border)
- "บันทึกด้วยตนเอง" - Manual entry (ขาว, ดำ text, border)

**Danger Actions:**
- "ยกเลิก" - Cancel (แดง, ขาว text)

### Responsive Design

- Mobile: Full screen modal
- Desktop: Centered modal (max-width: 500px)
- Timer display: Large, readable font (48px)
- Buttons: Touch-friendly (min-height: 44px)

## Implementation Notes

### Performance Considerations

1. **Timer Interval**: ใช้ 100ms interval แทน 1000ms เพื่อความแม่นยำ แต่อัพเดท UI ทุก 1 วินาที
2. **Cleanup**: ต้อง `clearInterval` เมื่อ component unmount หรือ modal close
3. **Background Tab**: ใช้ `Date.now()` เป็นหลัก ไม่พึ่งพา interval counter

### Accessibility

1. **Keyboard Navigation**: รองรับ Tab, Enter, Escape
2. **Screen Reader**: ใส่ aria-label สำหรับปุ่มและ timer display
3. **Focus Management**: Focus ที่ปุ่มแรกเมื่อเปิด modal

### Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- ใช้ `Date.now()` (รองรับทุก browser)
- ใช้ `setInterval` (รองรับทุก browser)
- ไม่ใช้ Web Workers (ไม่จำเป็นสำหรับ simple timer)
