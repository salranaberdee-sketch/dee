<template>
  <div class="facility-calendar">
    <!-- Header: เลือกสัปดาห์ -->
    <div class="calendar-header">
      <button class="nav-btn" @click="prevWeek">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>
      <span class="week-label">{{ weekLabel }}</span>
      <button class="nav-btn" @click="nextWeek">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </button>
    </div>

    <!-- ตารางปฏิทิน -->
    <div class="calendar-grid">
      <!-- Header: วัน -->
      <div class="grid-header">
        <div class="time-col"></div>
        <div 
          v-for="day in weekDays" 
          :key="day.date" 
          class="day-col"
          :class="{ today: day.isToday }"
        >
          <span class="day-name">{{ day.name }}</span>
          <span class="day-date">{{ day.dateNum }}</span>
        </div>
      </div>

      <!-- Body: ช่วงเวลา -->
      <div class="grid-body">
        <div v-for="slot in timeSlots" :key="slot.time" class="time-row">
          <div class="time-label">{{ slot.time }}</div>
          <div 
            v-for="day in weekDays" 
            :key="`${day.date}-${slot.time}`" 
            class="slot-cell"
            :class="getSlotClass(day.date, slot.time)"
            @click="handleSlotClick(day.date, slot)"
          >
            <!-- แสดงสถานะชัดเจน -->
            <span v-if="getSlotClass(day.date, slot.time) === 'available'" class="slot-status available-text">ว่าง</span>
            <span v-else-if="getSlotClass(day.date, slot.time) === 'pending'" class="slot-status pending-text">รออนุมัติ</span>
            <span v-else-if="getSlotClass(day.date, slot.time) === 'booked'" class="slot-status booked-text">จองแล้ว</span>
            <span v-else-if="getSlotClass(day.date, slot.time) === 'past'" class="slot-status past-text">ผ่านแล้ว</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Legend -->
    <div class="calendar-legend">
      <div class="legend-item">
        <span class="legend-color available"></span>
        <span>ว่าง</span>
      </div>
      <div class="legend-item">
        <span class="legend-color pending"></span>
        <span>รออนุมัติ</span>
      </div>
      <div class="legend-item">
        <span class="legend-color booked"></span>
        <span>จองแล้ว</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'

/**
 * FacilityCalendar - ปฏิทินแสดงช่วงเวลาว่าง/จอง
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */

const props = defineProps({
  facility: {
    type: Object,
    required: true
  },
  bookings: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['select-slot'])

// State
const currentWeekStart = ref(getWeekStart(new Date()))

// ดึงวันจันทร์ของสัปดาห์
function getWeekStart(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.setDate(diff))
}

// วันในสัปดาห์
const weekDays = computed(() => {
  const days = []
  const dayNames = ['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.']
  const today = new Date().toISOString().split('T')[0]

  for (let i = 0; i < 7; i++) {
    const date = new Date(currentWeekStart.value)
    date.setDate(date.getDate() + i)
    const dateStr = date.toISOString().split('T')[0]
    
    days.push({
      name: dayNames[i],
      date: dateStr,
      dateNum: date.getDate(),
      dayOfWeek: (i + 1) % 7, // 0=อาทิตย์, 1=จันทร์, ...
      isToday: dateStr === today
    })
  }
  return days
})

// Label สัปดาห์
const weekLabel = computed(() => {
  const start = new Date(currentWeekStart.value)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  
  const formatDate = (d) => d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
  return `${formatDate(start)} - ${formatDate(end)}`
})

// ช่วงเวลาจาก time_slots
const timeSlots = computed(() => {
  const slots = props.facility?.time_slots || []
  const uniqueTimes = new Set()
  
  slots.forEach(slot => {
    if (slot.is_active) {
      uniqueTimes.add(slot.start_time.substring(0, 5))
    }
  })
  
  return Array.from(uniqueTimes)
    .sort()
    .map(time => ({ time, endTime: getEndTime(time) }))
})

// หา end time จาก time_slots
function getEndTime(startTime) {
  const slot = props.facility?.time_slots?.find(
    s => s.start_time.substring(0, 5) === startTime
  )
  return slot?.end_time?.substring(0, 5) || ''
}

// ตรวจสอบว่าช่วงเวลานี้เปิดให้จองในวันนั้นหรือไม่
function isSlotAvailableForDay(dayOfWeek, time) {
  const slots = props.facility?.time_slots || []
  return slots.some(
    s => s.day_of_week === dayOfWeek && 
         s.start_time.substring(0, 5) === time && 
         s.is_active
  )
}

// ดึง booking ของช่วงเวลานั้น
function getSlotBooking(date, time) {
  return props.bookings.find(
    b => b.booking_date === date && 
         b.start_time.substring(0, 5) === time
  )
}

// กำหนด class ของ slot
function getSlotClass(date, time) {
  const day = weekDays.value.find(d => d.date === date)
  if (!day) return 'unavailable'
  
  // ตรวจสอบว่าเปิดให้จองในวันนี้หรือไม่
  if (!isSlotAvailableForDay(day.dayOfWeek, time)) {
    return 'unavailable'
  }
  
  // ตรวจสอบว่าเป็นวันที่ผ่านมาแล้วหรือไม่
  const today = new Date().toISOString().split('T')[0]
  if (date < today) {
    return 'past'
  }
  
  // ตรวจสอบ booking
  const booking = getSlotBooking(date, time)
  if (booking) {
    return booking.status === 'pending' ? 'pending' : 'booked'
  }
  
  return 'available'
}

// คลิกเลือก slot
function handleSlotClick(date, slot) {
  const slotClass = getSlotClass(date, slot.time)
  if (slotClass === 'available') {
    emit('select-slot', {
      date,
      startTime: slot.time,
      endTime: slot.endTime
    })
  }
}

// Navigation
function prevWeek() {
  const newStart = new Date(currentWeekStart.value)
  newStart.setDate(newStart.getDate() - 7)
  currentWeekStart.value = newStart
}

function nextWeek() {
  const newStart = new Date(currentWeekStart.value)
  newStart.setDate(newStart.getDate() + 7)
  currentWeekStart.value = newStart
}

// Expose สำหรับ parent
defineExpose({
  currentWeekStart,
  weekDays
})
</script>

<style scoped>
.facility-calendar {
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 12px;
  overflow: hidden;
}

.calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #FAFAFA;
  border-bottom: 1px solid #E5E5E5;
}

.nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.nav-btn:hover {
  background: #F5F5F5;
}

.nav-btn svg {
  width: 18px;
  height: 18px;
  color: #525252;
}

.week-label {
  font-size: 14px;
  font-weight: 600;
  color: #171717;
}

.calendar-grid {
  overflow-x: auto;
}

.grid-header {
  display: grid;
  grid-template-columns: 60px repeat(7, 1fr);
  border-bottom: 1px solid #E5E5E5;
}

.time-col {
  padding: 8px;
  background: #FAFAFA;
}

.day-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 4px;
  border-left: 1px solid #E5E5E5;
}

.day-col.today {
  background: #F0FDF4;
}

.day-name {
  font-size: 12px;
  color: #737373;
}

.day-date {
  font-size: 14px;
  font-weight: 600;
  color: #171717;
}

.day-col.today .day-date {
  color: #22C55E;
}

.grid-body {
  max-height: 300px;
  overflow-y: auto;
}

.time-row {
  display: grid;
  grid-template-columns: 60px repeat(7, 1fr);
  border-bottom: 1px solid #F5F5F5;
}

.time-label {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  font-size: 12px;
  color: #737373;
  background: #FAFAFA;
}

.slot-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  padding: 4px;
  border-left: 1px solid #F5F5F5;
  cursor: pointer;
  transition: background 0.2s;
}

/* สถานะ: ว่าง - เขียวอ่อน */
.slot-cell.available {
  background: #ECFDF5;
  border: 1px solid #A7F3D0;
}

.slot-cell.available:hover {
  background: #D1FAE5;
  border-color: #6EE7B7;
}

/* สถานะ: รออนุมัติ - เหลือง */
.slot-cell.pending {
  background: #FFFBEB;
  border: 1px solid #FDE68A;
}

/* สถานะ: จองแล้ว - แดงอ่อน */
.slot-cell.booked {
  background: #FEF2F2;
  border: 1px solid #FECACA;
  cursor: default;
}

/* สถานะ: ไม่เปิดให้จอง / ผ่านแล้ว */
.slot-cell.unavailable,
.slot-cell.past {
  background: #F9FAFB;
  cursor: default;
}

/* ข้อความสถานะในช่อง */
.slot-status {
  font-size: 10px;
  font-weight: 600;
  text-align: center;
  padding: 2px 6px;
  border-radius: 4px;
}

.slot-status.available-text {
  color: #059669;
  background: #D1FAE5;
}

.slot-status.pending-text {
  color: #92400E;
  background: #FEF3C7;
}

.slot-status.booked-text {
  color: #991B1B;
  background: #FEE2E2;
}

.slot-status.past-text {
  color: #6B7280;
  background: #F3F4F6;
}

.calendar-legend {
  display: flex;
  gap: 16px;
  padding: 12px 16px;
  background: #FAFAFA;
  border-top: 1px solid #E5E5E5;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #525252;
}

.legend-color {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 1px solid #E5E5E5;
}

.legend-color.available {
  background: #fff;
}

.legend-color.pending {
  background: #FEF3C7;
}

.legend-color.booked {
  background: #F3F4F6;
}
</style>
