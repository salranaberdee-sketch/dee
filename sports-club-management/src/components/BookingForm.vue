<template>
  <div class="booking-form">
    <h3>จองสถานที่</h3>
    
    <form @submit.prevent="handleSubmit">
      <!-- วันที่ -->
      <div class="form-group">
        <label>วันที่</label>
        <input 
          type="date" 
          v-model="form.booking_date" 
          :min="today"
          required
        />
      </div>

      <!-- ช่วงเวลา -->
      <div class="form-row">
        <div class="form-group">
          <label>เวลาเริ่ม</label>
          <select v-model="form.start_time" required>
            <option value="">เลือก...</option>
            <option v-for="slot in availableSlots" :key="slot.start" :value="slot.start">
              {{ slot.start }}
            </option>
          </select>
        </div>
        <div class="form-group">
          <label>เวลาสิ้นสุด</label>
          <input type="text" :value="form.end_time" disabled />
        </div>
      </div>

      <!-- จุดประสงค์ -->
      <div class="form-group">
        <label>จุดประสงค์</label>
        <textarea 
          v-model="form.purpose" 
          rows="2" 
          placeholder="ระบุจุดประสงค์การใช้งาน..."
        ></textarea>
      </div>

      <!-- Recurring Toggle -->
      <div class="recurring-section">
        <label class="toggle-label">
          <input type="checkbox" v-model="isRecurring" />
          <span class="toggle-text">จองซ้ำรายสัปดาห์</span>
        </label>

        <div v-if="isRecurring" class="recurring-options">
          <label>จำนวนสัปดาห์</label>
          <div class="week-buttons">
            <button 
              v-for="w in [2, 3, 4, 5, 6, 7, 8]" 
              :key="w"
              type="button"
              class="week-btn"
              :class="{ active: recurringWeeks === w }"
              @click="recurringWeeks = w"
            >
              {{ w }}
            </button>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="form-actions">
        <button type="button" class="btn-secondary" @click="$emit('cancel')">
          ยกเลิก
        </button>
        <button type="submit" class="btn-primary" :disabled="loading || !isValid">
          {{ loading ? 'กำลังจอง...' : (isRecurring ? `จอง ${recurringWeeks} สัปดาห์` : 'จอง') }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

/**
 * BookingForm - ฟอร์มจองสถานที่
 * Requirements: 2.1, 7.1, 7.2
 */

const props = defineProps({
  facility: {
    type: Object,
    required: true
  },
  selectedSlot: {
    type: Object,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['submit', 'cancel'])

// State
const form = ref({
  booking_date: '',
  start_time: '',
  end_time: '',
  purpose: ''
})
const isRecurring = ref(false)
const recurringWeeks = ref(4)

// Computed
const today = computed(() => new Date().toISOString().split('T')[0])

const availableSlots = computed(() => {
  if (!form.value.booking_date || !props.facility?.time_slots) return []
  
  const date = new Date(form.value.booking_date)
  const dayOfWeek = date.getDay() // 0=อาทิตย์
  
  return props.facility.time_slots
    .filter(slot => slot.day_of_week === dayOfWeek && slot.is_active)
    .map(slot => ({
      start: slot.start_time.substring(0, 5),
      end: slot.end_time.substring(0, 5)
    }))
    .sort((a, b) => a.start.localeCompare(b.start))
})

const isValid = computed(() => {
  return form.value.booking_date && 
         form.value.start_time && 
         form.value.end_time
})

// Watch: อัปเดต end_time เมื่อเลือก start_time
watch(() => form.value.start_time, (newVal) => {
  const slot = availableSlots.value.find(s => s.start === newVal)
  form.value.end_time = slot?.end || ''
})

// Watch: อัปเดตจาก selectedSlot
watch(() => props.selectedSlot, (newVal) => {
  if (newVal) {
    form.value.booking_date = newVal.date
    form.value.start_time = newVal.startTime
    form.value.end_time = newVal.endTime
  }
}, { immediate: true })

// Submit
function handleSubmit() {
  if (!isValid.value) return
  
  emit('submit', {
    facility_id: props.facility.id,
    booking_date: form.value.booking_date,
    start_time: form.value.start_time,
    end_time: form.value.end_time,
    purpose: form.value.purpose,
    isRecurring: isRecurring.value,
    weeks: isRecurring.value ? recurringWeeks.value : 1
  })
}
</script>

<style scoped>
.booking-form {
  padding: 20px;
  background: #FAFAFA;
  border-radius: 12px;
}

.booking-form h3 {
  font-size: 16px;
  font-weight: 600;
  color: #171717;
  margin: 0 0 16px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 6px;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  font-size: 14px;
  background: #fff;
}

.form-group input:disabled {
  background: #F5F5F5;
  color: #737373;
}

.form-group textarea {
  resize: vertical;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.recurring-section {
  padding: 16px;
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  margin-bottom: 16px;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.toggle-label input {
  width: 18px;
  height: 18px;
  accent-color: #171717;
}

.toggle-text {
  font-size: 14px;
  font-weight: 500;
  color: #171717;
}

.recurring-options {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #E5E5E5;
}

.recurring-options label {
  display: block;
  font-size: 13px;
  color: #525252;
  margin-bottom: 8px;
}

.week-buttons {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.week-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #525252;
  cursor: pointer;
  transition: all 0.2s;
}

.week-btn:hover {
  border-color: #171717;
}

.week-btn.active {
  background: #171717;
  border-color: #171717;
  color: #fff;
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn-primary {
  background: #171717;
  color: #fff;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.btn-primary:hover:not(:disabled) {
  background: #262626;
}

.btn-primary:disabled {
  background: #A3A3A3;
  cursor: not-allowed;
}

.btn-secondary {
  background: #fff;
  color: #171717;
  border: 1px solid #E5E5E5;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.btn-secondary:hover {
  background: #F5F5F5;
}
</style>
