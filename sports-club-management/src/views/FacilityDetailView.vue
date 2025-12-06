<template>
  <div class="facility-detail-page">
    <!-- Back Button -->
    <router-link to="/facilities" class="back-link">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
      </svg>
      กลับ
    </router-link>

    <!-- Loading -->
    <div v-if="loading" class="loading">
      <div class="loading-spinner"></div>
      <span>กำลังโหลด...</span>
    </div>

    <!-- Content -->
    <template v-else-if="facility">
      <!-- Header -->
      <div class="facility-header">
        <div class="facility-image">
          <img v-if="facility.image_url" :src="facility.image_url" :alt="facility.name" />
          <div v-else class="image-placeholder">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
        </div>
        <div class="facility-info">
          <h1>{{ facility.name }}</h1>
          <p v-if="facility.description" class="description">{{ facility.description }}</p>
          <div class="meta">
            <span class="capacity">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 00-3-3.87"/>
                <path d="M16 3.13a4 4 0 010 7.75"/>
              </svg>
              ความจุ {{ facility.capacity }} คน
            </span>
          </div>
        </div>
      </div>

      <!-- Calendar & Form -->
      <div class="booking-section">
        <div class="calendar-wrapper">
          <h2>เลือกวันและเวลา</h2>
          <FacilityCalendar 
            ref="calendarRef"
            :facility="facility"
            :bookings="calendarBookings"
            @select-slot="handleSlotSelect"
          />
        </div>

        <div class="form-wrapper">
          <BookingForm 
            v-if="showBookingForm"
            :facility="facility"
            :selected-slot="selectedSlot"
            :loading="submitting"
            @submit="handleBookingSubmit"
            @cancel="closeBookingForm"
          />
          <div v-else class="form-placeholder">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <p>คลิกช่องว่างในปฏิทินเพื่อจอง</p>
          </div>
        </div>
      </div>
    </template>

    <!-- Error -->
    <div v-else class="error-state">
      <p>ไม่พบสถานที่</p>
      <router-link to="/facilities" class="btn-primary">กลับหน้ารายการ</router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useFacilityStore } from '@/stores/facility'
import FacilityCalendar from '@/components/FacilityCalendar.vue'
import BookingForm from '@/components/BookingForm.vue'

/**
 * FacilityDetailView - หน้ารายละเอียดสถานที่ + จอง
 * Requirements: 6.1, 2.1
 */

const route = useRoute()
const router = useRouter()
const facilityStore = useFacilityStore()

// State
const loading = ref(true)
const submitting = ref(false)
const facility = ref(null)
const calendarBookings = ref([])
const selectedSlot = ref(null)
const showBookingForm = ref(false)
const calendarRef = ref(null)

// โหลดข้อมูลสถานที่
async function loadFacility() {
  loading.value = true
  const result = await facilityStore.fetchFacilityById(route.params.id)
  if (result.success) {
    facility.value = result.data
    await loadCalendarBookings()
  }
  loading.value = false
}

// โหลด bookings สำหรับปฏิทิน
async function loadCalendarBookings() {
  if (!calendarRef.value) return
  
  const weekDays = calendarRef.value.weekDays
  if (!weekDays || weekDays.length === 0) return
  
  const startDate = weekDays[0].date
  const endDate = weekDays[weekDays.length - 1].date
  
  const result = await facilityStore.fetchFacilityBookings(
    facility.value.id,
    startDate,
    endDate
  )
  
  if (result.success) {
    calendarBookings.value = result.data
  }
}

// เลือก slot จากปฏิทิน
function handleSlotSelect(slot) {
  selectedSlot.value = slot
  showBookingForm.value = true
}

// ปิดฟอร์ม
function closeBookingForm() {
  showBookingForm.value = false
  selectedSlot.value = null
}

// ส่งคำขอจอง
async function handleBookingSubmit(data) {
  submitting.value = true
  
  let result
  if (data.isRecurring && data.weeks > 1) {
    result = await facilityStore.createRecurringBooking(data, data.weeks)
  } else {
    result = await facilityStore.createBooking(data)
  }
  
  submitting.value = false
  
  if (result.success) {
    alert(result.message || 'ส่งคำขอจองเรียบร้อยแล้ว รอการอนุมัติ')
    closeBookingForm()
    await loadCalendarBookings()
  } else {
    alert(result.message || 'ไม่สามารถจองได้')
  }
}

// Watch: โหลด bookings เมื่อเปลี่ยนสัปดาห์
watch(() => calendarRef.value?.currentWeekStart, () => {
  if (facility.value) {
    loadCalendarBookings()
  }
})

onMounted(() => {
  loadFacility()
})
</script>

<style scoped>
.facility-detail-page {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #525252;
  text-decoration: none;
  font-size: 14px;
  margin-bottom: 16px;
}

.back-link:hover {
  color: #171717;
}

.back-link svg {
  width: 18px;
  height: 18px;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px;
  color: #737373;
  gap: 12px;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #E5E5E5;
  border-top-color: #171717;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.facility-header {
  display: flex;
  gap: 24px;
  margin-bottom: 24px;
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 12px;
  overflow: hidden;
}

.facility-image {
  width: 300px;
  height: 200px;
  flex-shrink: 0;
  background: #F5F5F5;
}

.facility-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #A3A3A3;
}

.image-placeholder svg {
  width: 64px;
  height: 64px;
}

.facility-info {
  padding: 24px;
  flex: 1;
}

.facility-info h1 {
  font-size: 24px;
  font-weight: 600;
  color: #171717;
  margin: 0 0 8px;
}

.description {
  color: #525252;
  margin: 0 0 16px;
  font-size: 14px;
}

.meta {
  display: flex;
  gap: 16px;
}

.capacity {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #737373;
}

.capacity svg {
  width: 18px;
  height: 18px;
}

.booking-section {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 24px;
}

.calendar-wrapper h2 {
  font-size: 16px;
  font-weight: 600;
  color: #171717;
  margin: 0 0 12px;
}

.form-wrapper {
  position: sticky;
  top: 24px;
  height: fit-content;
}

.form-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  background: #FAFAFA;
  border: 1px dashed #E5E5E5;
  border-radius: 12px;
  color: #A3A3A3;
  text-align: center;
}

.form-placeholder svg {
  width: 48px;
  height: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.form-placeholder p {
  margin: 0;
  font-size: 14px;
}

.error-state {
  text-align: center;
  padding: 64px 24px;
  color: #737373;
}

.error-state p {
  margin: 0 0 16px;
  font-size: 16px;
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: #171717;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  text-decoration: none;
  cursor: pointer;
}

.btn-primary:hover {
  background: #262626;
}

@media (max-width: 900px) {
  .facility-detail-page {
    padding: 16px;
  }

  .facility-header {
    flex-direction: column;
  }

  .facility-image {
    width: 100%;
    height: 180px;
  }

  .booking-section {
    grid-template-columns: 1fr;
  }

  .form-wrapper {
    position: static;
  }
}
</style>
