<template>
  <div class="facility-page">
    <!-- Header -->
    <div class="page-header">
      <button class="back-btn" @click="router.back()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>
      <h1>สถานที่</h1>
      <div class="header-actions">
        <!-- ปุ่มจัดการสำหรับ Admin -->
        <router-link v-if="isAdmin" to="/facility-manage" class="manage-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
          </svg>
        </router-link>
        <!-- ปุ่มอนุมัติสำหรับ Admin/Coach -->
        <router-link v-if="isAdminOrCoach" to="/booking-manage" class="manage-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
          </svg>
        </router-link>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs" :class="{ 'three-tabs': isAdminOrCoach }">
      <button 
        class="tab" 
        :class="{ active: activeTab === 'facilities' }"
        @click="activeTab = 'facilities'"
      >
        จองสถานที่
      </button>
      <!-- แท็บคำขอรออนุมัติ สำหรับ Admin/Coach -->
      <button 
        v-if="isAdminOrCoach"
        class="tab" 
        :class="{ active: activeTab === 'requests' }"
        @click="activeTab = 'requests'; loadPendingRequests()"
      >
        คำขอรออนุมัติ
        <span v-if="pendingRequestsCount > 0" class="tab-badge warning">{{ pendingRequestsCount }}</span>
      </button>
      <button 
        class="tab" 
        :class="{ active: activeTab === 'tracking' }"
        @click="activeTab = 'tracking'; loadMyBookings()"
      >
        {{ isAdminOrCoach ? 'การจองของฉัน' : 'ติดตามสถานะ' }}
        <span v-if="!isAdminOrCoach && pendingCount > 0" class="tab-badge">{{ pendingCount }}</span>
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
    </div>

    <!-- Tab: คำขอรออนุมัติ (Admin/Coach) -->
    <template v-if="activeTab === 'requests' && isAdminOrCoach">
      <div class="requests-content">
        <!-- Loading -->
        <div v-if="loadingRequests" class="loading">
          <div class="spinner"></div>
        </div>

        <!-- ไม่มีคำขอ -->
        <div v-else-if="pendingRequests.length === 0" class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          <p>ไม่มีคำขอที่รออนุมัติ</p>
        </div>

        <!-- รายการคำขอ -->
        <div v-else class="requests-list">
          <div 
            v-for="request in pendingRequests" 
            :key="request.id" 
            class="request-card"
          >
            <div class="request-header">
              <div class="request-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <div class="request-info">
                <span class="requester-name">{{ request.athlete?.name || 'นักกีฬา' }}</span>
                <span class="facility-name">{{ request.facility?.name || 'สถานที่' }}</span>
              </div>
              <span v-if="request.series_id" class="series-tag">จองซ้ำ</span>
            </div>
            <div class="request-details">
              <div class="detail-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
                </svg>
                <span>{{ formatDate(request.booking_date) }}</span>
              </div>
              <div class="detail-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                <span>{{ formatTime(request.start_time) }} - {{ formatTime(request.end_time) }}</span>
              </div>
            </div>
            <p v-if="request.purpose" class="request-purpose">{{ request.purpose }}</p>
            <div class="request-actions">
              <button class="btn-approve" @click="handleApprove(request)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                อนุมัติ
              </button>
              <button class="btn-reject" @click="openRejectModal(request)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
                ปฏิเสธ
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Tab: จองสถานที่ -->
    <template v-else-if="activeTab === 'facilities'">
      <!-- Empty State -->
      <div v-if="facilities.length === 0" class="empty-state">
        <div class="empty-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </div>
        <p>ยังไม่มีศูนย์ฝึกให้จอง</p>
        <router-link v-if="isAdmin" to="/facility-manage" class="add-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          เพิ่มศูนย์ฝึก
        </router-link>
      </div>

      <!-- รายการสถานที่ -->
      <div v-else class="content">
        <!-- สถานที่หลัก -->
        <div class="main-facility">
          <div class="facility-image">
            <img v-if="mainFacility.image_url" :src="mainFacility.image_url" :alt="mainFacility.name" />
            <div v-else class="image-placeholder">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <div class="status-badge" :class="statusClass">{{ statusText }}</div>
          </div>

          <div class="facility-info">
            <h2>{{ mainFacility.name }}</h2>
            <p v-if="mainFacility.description" class="description">{{ mainFacility.description }}</p>
            <div class="meta-row">
              <div class="meta-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                </svg>
                <span>รองรับ {{ mainFacility.capacity }} คน</span>
              </div>
              <div class="meta-item" :class="{ 'available': availableSlots > 0, 'full': availableSlots === 0 }">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                <span>{{ availableSlots > 0 ? `ว่าง ${availableSlots} ช่องวันนี้` : 'เต็มวันนี้' }}</span>
              </div>
            </div>
          </div>

          <button class="book-btn" @click="goToFacility(mainFacility)">
            <span>{{ availableSlots > 0 ? 'จองเลย' : 'ดูตารางวันอื่น' }}</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          </button>
        </div>

        <!-- สถานที่อื่นๆ -->
        <div v-if="otherFacilities.length > 0" class="other-facilities">
          <h3>สถานที่อื่น</h3>
          <div class="facility-list">
            <div 
              v-for="facility in otherFacilities" 
              :key="facility.id" 
              class="facility-item"
              @click="goToFacility(facility)"
            >
              <div class="item-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
              </div>
              <div class="item-info">
                <span class="item-name">{{ facility.name }}</span>
                <span class="item-capacity">{{ facility.capacity }} คน</span>
              </div>
              <svg class="item-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Tab: ติดตามสถานะ (Athlete) / การจองของฉัน (Admin/Coach) -->
    <template v-else-if="activeTab === 'tracking'">
      <div class="tracking-content">
        
        <!-- ===== UI สำหรับ Admin/Coach (ผู้อนุมัติ) ===== -->
        <template v-if="isAdminOrCoach">
          <!-- สรุปการจองของฉัน -->
          <div class="status-summary two-cols">
            <div class="status-card approved">
              <div class="status-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
                </svg>
              </div>
              <div class="status-info">
                <span class="status-count">{{ upcomingBookings.length }}</span>
                <span class="status-label">กำลังจะมาถึง</span>
              </div>
            </div>
            <div class="status-card past">
              <div class="status-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <div class="status-info">
                <span class="status-count">{{ pastBookings.length }}</span>
                <span class="status-label">ผ่านมาแล้ว</span>
              </div>
            </div>
          </div>

          <!-- รายการกำลังจะมาถึง -->
          <div v-if="upcomingBookings.length > 0" class="tracking-group">
            <h3 class="group-title">
              <span class="dot approved"></span>
              กำลังจะมาถึง ({{ upcomingBookings.length }})
            </h3>
            <BookingCard 
              v-for="booking in upcomingBookings" 
              :key="booking.id"
              :booking="booking"
              :show-actions="false"
            />
          </div>

          <!-- รายการผ่านมาแล้ว -->
          <div v-if="pastBookings.length > 0" class="tracking-group">
            <h3 class="group-title">
              <span class="dot past"></span>
              ผ่านมาแล้ว ({{ pastBookings.length }})
            </h3>
            <BookingCard 
              v-for="booking in pastBookings" 
              :key="booking.id"
              :booking="booking"
              :show-actions="false"
            />
          </div>

          <!-- ไม่มีการจอง -->
          <div v-if="upcomingBookings.length === 0 && pastBookings.length === 0" class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
            </svg>
            <p>ยังไม่มีการจอง</p>
            <button class="btn-secondary" @click="activeTab = 'facilities'">จองสถานที่</button>
          </div>
        </template>

        <!-- ===== UI สำหรับ Athlete (ผู้ขอจอง) ===== -->
        <template v-else>
          <!-- สรุปสถานะคำขอ -->
          <div class="status-summary">
            <div class="status-card pending">
              <div class="status-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <div class="status-info">
                <span class="status-count">{{ pendingMyBookings.length }}</span>
                <span class="status-label">รออนุมัติ</span>
              </div>
            </div>
            <div class="status-card approved">
              <div class="status-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </div>
              <div class="status-info">
                <span class="status-count">{{ upcomingBookings.length }}</span>
                <span class="status-label">อนุมัติแล้ว</span>
              </div>
            </div>
            <div class="status-card rejected">
              <div class="status-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
              </div>
              <div class="status-info">
                <span class="status-count">{{ rejectedBookings.length }}</span>
                <span class="status-label">ถูกปฏิเสธ</span>
              </div>
            </div>
          </div>

          <!-- รายการรออนุมัติ -->
          <div v-if="pendingMyBookings.length > 0" class="tracking-group">
            <h3 class="group-title">
              <span class="dot pending"></span>
              รออนุมัติ ({{ pendingMyBookings.length }})
            </h3>
            <BookingCard 
              v-for="booking in pendingMyBookings" 
              :key="booking.id"
              :booking="booking"
              @cancel="handleCancel"
              @cancel-series="handleCancelSeries"
            />
          </div>

          <!-- รายการอนุมัติแล้ว -->
          <div v-if="upcomingBookings.length > 0" class="tracking-group">
            <h3 class="group-title">
              <span class="dot approved"></span>
              อนุมัติแล้ว ({{ upcomingBookings.length }})
            </h3>
            <BookingCard 
              v-for="booking in upcomingBookings" 
              :key="booking.id"
              :booking="booking"
              :show-actions="false"
            />
          </div>

          <!-- รายการถูกปฏิเสธ -->
          <div v-if="rejectedBookings.length > 0" class="tracking-group">
            <h3 class="group-title">
              <span class="dot rejected"></span>
              ถูกปฏิเสธ ({{ rejectedBookings.length }})
            </h3>
            <BookingCard 
              v-for="booking in rejectedBookings" 
              :key="booking.id"
              :booking="booking"
              :show-actions="false"
            />
          </div>

          <!-- ไม่มีคำขอ -->
          <div v-if="pendingMyBookings.length === 0 && upcomingBookings.length === 0 && rejectedBookings.length === 0" class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <p>ยังไม่มีการจอง</p>
            <button class="btn-secondary" @click="activeTab = 'facilities'">จองสถานที่</button>
          </div>
        </template>
      </div>
    </template>

    <!-- Modal ปฏิเสธคำขอ -->
    <div v-if="showRejectModal" class="modal-overlay" @click.self="closeRejectModal">
      <div class="modal">
        <h3>ปฏิเสธคำขอจอง</h3>
        <p class="modal-subtitle">กรุณาระบุเหตุผลในการปฏิเสธ</p>
        
        <div class="form-group">
          <label>เหตุผล</label>
          <textarea 
            v-model="rejectReason" 
            rows="3" 
            placeholder="ระบุเหตุผล..."
            required
          ></textarea>
        </div>

        <div class="modal-actions">
          <button class="btn-modal-cancel" @click="closeRejectModal">ยกเลิก</button>
          <button 
            class="btn-modal-reject" 
            @click="confirmReject"
            :disabled="!rejectReason.trim()"
          >
            ยืนยันปฏิเสธ
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useFacilityStore } from '@/stores/facility'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabase'
import BookingCard from '@/components/BookingCard.vue'

/**
 * FacilityListView - หน้าสถานที่ (รวมจองและติดตามสถานะ)
 * ออกแบบให้เข้าใจได้ใน 3 วินาที
 */

const router = useRouter()
const facilityStore = useFacilityStore()
const authStore = useAuthStore()
const { facilities, loading, upcomingBookings, pendingMyBookings, pastBookings, pendingBookings } = storeToRefs(facilityStore)

// แท็บที่เลือก
const activeTab = ref('facilities')

// ตรวจสอบ role
const isAdmin = computed(() => authStore.isAdmin)
const isAdminOrCoach = computed(() => authStore.isAdmin || authStore.isCoach)

// จำนวนช่องว่างวันนี้
const availableSlots = ref(0)

// จำนวนคำขอรออนุมัติ (สำหรับ badge ของ Athlete)
const pendingCount = computed(() => pendingMyBookings.value.length)

// คำขอจากนักกีฬาที่รออนุมัติ (สำหรับ Admin/Coach)
const pendingRequests = computed(() => pendingBookings.value)
const pendingRequestsCount = computed(() => pendingBookings.value.length)
const loadingRequests = ref(false)

// Modal สำหรับปฏิเสธ
const showRejectModal = ref(false)
const selectedRequest = ref(null)
const rejectReason = ref('')

// สถานที่หลัก (ตัวแรก)
const mainFacility = computed(() => facilities.value[0] || null)

// สถานที่อื่นๆ
const otherFacilities = computed(() => facilities.value.slice(1))

// รายการที่ถูกปฏิเสธ
const rejectedBookings = computed(() => 
  pastBookings.value.filter(b => b.status === 'rejected')
)

// สถานะ badge
const statusClass = computed(() => {
  if (availableSlots.value > 3) return 'available'
  if (availableSlots.value > 0) return 'limited'
  return 'full'
})

const statusText = computed(() => {
  if (availableSlots.value > 3) return 'ว่าง'
  if (availableSlots.value > 0) return `เหลือ ${availableSlots.value} ช่อง`
  return 'เต็ม'
})

// ไปหน้ารายละเอียด
function goToFacility(facility) {
  router.push(`/facilities/${facility.id}`)
}

// โหลดการจองของฉัน
async function loadMyBookings() {
  await facilityStore.fetchMyBookings()
}

// โหลดคำขอรออนุมัติ (สำหรับ Admin/Coach)
async function loadPendingRequests() {
  loadingRequests.value = true
  await facilityStore.fetchPendingBookings()
  loadingRequests.value = false
}

// จัดรูปแบบวันที่
function formatDate(date) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('th-TH', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  })
}

// จัดรูปแบบเวลา
function formatTime(time) {
  if (!time) return '-'
  return time.substring(0, 5)
}

// อนุมัติคำขอ
async function handleApprove(request) {
  if (!confirm('ต้องการอนุมัติคำขอนี้?')) return
  
  const result = await facilityStore.approveBooking(request.id)
  if (result.success) {
    alert('อนุมัติเรียบร้อยแล้ว')
  } else {
    alert(result.message || 'ไม่สามารถอนุมัติได้')
  }
}

// เปิด modal ปฏิเสธ
function openRejectModal(request) {
  selectedRequest.value = request
  rejectReason.value = ''
  showRejectModal.value = true
}

// ปิด modal ปฏิเสธ
function closeRejectModal() {
  showRejectModal.value = false
  selectedRequest.value = null
  rejectReason.value = ''
}

// ยืนยันปฏิเสธ
async function confirmReject() {
  if (!rejectReason.value.trim()) {
    alert('กรุณาระบุเหตุผล')
    return
  }

  const result = await facilityStore.rejectBooking(
    selectedRequest.value.id, 
    rejectReason.value
  )
  
  if (result.success) {
    alert('ปฏิเสธเรียบร้อยแล้ว')
    closeRejectModal()
  } else {
    alert(result.message || 'ไม่สามารถปฏิเสธได้')
  }
}

// ยกเลิกการจอง
async function handleCancel(bookingId) {
  if (!confirm('ต้องการยกเลิกการจองนี้?')) return
  
  const result = await facilityStore.cancelBooking(bookingId)
  if (result.success) {
    alert('ยกเลิกการจองเรียบร้อยแล้ว')
  } else {
    alert(result.message || 'ไม่สามารถยกเลิกได้')
  }
}

// ยกเลิกการจองทั้ง series
async function handleCancelSeries(seriesId) {
  if (!confirm('ต้องการยกเลิกการจองทั้ง series?')) return
  
  const result = await facilityStore.cancelRecurringSeries(seriesId)
  if (result.success) {
    alert('ยกเลิกการจองทั้ง series เรียบร้อยแล้ว')
  } else {
    alert(result.message || 'ไม่สามารถยกเลิกได้')
  }
}

// ดึงจำนวนช่องว่างวันนี้
async function fetchAvailableSlots() {
  if (!mainFacility.value) return
  
  try {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase.rpc('get_available_slots_count', {
      p_facility_id: mainFacility.value.id,
      p_date: today
    })
    availableSlots.value = data ?? 0
  } catch (err) {
    console.error('Error fetching slots:', err)
    availableSlots.value = 0
  }
}

onMounted(async () => {
  await facilityStore.fetchFacilities()
  await facilityStore.fetchMyBookings()
  fetchAvailableSlots()
  
  // โหลดคำขอรออนุมัติสำหรับ Admin/Coach
  if (authStore.isAdmin || authStore.isCoach) {
    await facilityStore.fetchPendingBookings()
  }
})
</script>


<style scoped>
.facility-page {
  min-height: 100vh;
  background: var(--gray-50);
  padding-bottom: 80px;
}

/* Header */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: var(--white);
  border-bottom: 1px solid var(--gray-200);
  position: sticky;
  top: 0;
  z-index: 10;
}

.page-header h1 {
  font-size: 18px;
  font-weight: 600;
  color: var(--gray-900);
  margin: 0;
}

.back-btn, .manage-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  color: var(--gray-700);
  text-decoration: none;
}

.back-btn:active, .manage-btn:active {
  background: var(--gray-100);
}

.back-btn svg, .manage-btn svg {
  width: 22px;
  height: 22px;
}

.header-actions {
  display: flex;
  gap: 4px;
}

/* Tabs */
.tabs {
  display: flex;
  gap: 4px;
  margin: 16px;
  padding: 4px;
  background: var(--gray-100);
  border-radius: 10px;
}

.tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 16px;
  background: transparent;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--gray-600);
  cursor: pointer;
  transition: all 0.2s;
}

.tab:hover {
  color: var(--gray-900);
}

.tab.active {
  background: var(--white);
  color: var(--gray-900);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.tab-badge {
  padding: 2px 8px;
  background: #FEF3C7;
  color: #92400E;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
}

/* Loading */
.loading {
  display: flex;
  justify-content: center;
  padding: 80px 0;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--gray-200);
  border-top-color: var(--gray-900);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 48px 24px;
  margin: 16px;
  background: var(--white);
  border-radius: 12px;
}

.empty-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 16px;
  background: var(--gray-100);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-icon svg, .empty-state > svg {
  width: 40px;
  height: 40px;
  color: var(--gray-400);
  margin-bottom: 12px;
}

.empty-state p {
  color: var(--gray-500);
  font-size: 15px;
  margin: 0 0 20px;
}

.add-btn, .btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: var(--gray-900);
  color: var(--white);
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
}

.btn-secondary {
  background: var(--white);
  color: var(--gray-900);
  border: 1px solid var(--gray-200);
}

.add-btn svg {
  width: 20px;
  height: 20px;
}

/* Content */
.content {
  padding: 0 16px 16px;
}

/* Main Facility Card */
.main-facility {
  background: var(--white);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.facility-image {
  position: relative;
  height: 180px;
  background: var(--gray-100);
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
}

.image-placeholder svg {
  width: 64px;
  height: 64px;
  color: var(--gray-300);
}

/* Status Badge */
.status-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
}

.status-badge.available {
  background: #D1FAE5;
  color: #065F46;
}

.status-badge.limited {
  background: #FEF3C7;
  color: #92400E;
}

.status-badge.full {
  background: #FEE2E2;
  color: #991B1B;
}

/* Facility Info */
.facility-info {
  padding: 20px;
}

.facility-info h2 {
  font-size: 20px;
  font-weight: 600;
  color: var(--gray-900);
  margin: 0 0 8px;
}

.description {
  font-size: 14px;
  color: var(--gray-500);
  margin: 0 0 16px;
  line-height: 1.5;
}

.meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: var(--gray-600);
}

.meta-item svg {
  width: 18px;
  height: 18px;
}

.meta-item.available {
  color: #059669;
}

.meta-item.full {
  color: #DC2626;
}

/* Book Button */
.book-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: calc(100% - 40px);
  margin: 0 20px 20px;
  padding: 14px;
  background: var(--gray-900);
  color: var(--white);
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}

.book-btn svg {
  width: 20px;
  height: 20px;
}

/* Other Facilities */
.other-facilities {
  margin-top: 24px;
}

.other-facilities h3 {
  font-size: 14px;
  font-weight: 600;
  color: var(--gray-500);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0 0 12px;
}

.facility-list {
  background: var(--white);
  border-radius: 12px;
  overflow: hidden;
}

.facility-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--gray-100);
  cursor: pointer;
}

.facility-item:last-child {
  border-bottom: none;
}

.item-icon {
  width: 40px;
  height: 40px;
  background: var(--gray-900);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.item-icon svg {
  width: 20px;
  height: 20px;
  color: var(--white);
}

.item-info {
  flex: 1;
}

.item-name {
  display: block;
  font-size: 15px;
  font-weight: 500;
  color: var(--gray-900);
}

.item-capacity {
  font-size: 13px;
  color: var(--gray-500);
}

.item-arrow {
  width: 20px;
  height: 20px;
  color: var(--gray-400);
}

/* Tracking Content */
.tracking-content {
  padding: 0 16px 16px;
}

.status-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 20px;
}

.status-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 8px;
  background: var(--white);
  border-radius: 12px;
  text-align: center;
}

.status-card.pending {
  border-top: 3px solid #F59E0B;
}

.status-card.approved {
  border-top: 3px solid #22C55E;
}

.status-card.rejected {
  border-top: 3px solid #EF4444;
}

.status-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
}

.status-card.pending .status-icon {
  background: #FEF3C7;
  color: #92400E;
}

.status-card.approved .status-icon {
  background: #D1FAE5;
  color: #065F46;
}

.status-card.rejected .status-icon {
  background: #FEE2E2;
  color: #991B1B;
}

.status-icon svg {
  width: 18px;
  height: 18px;
}

.status-info {
  display: flex;
  flex-direction: column;
}

.status-count {
  font-size: 20px;
  font-weight: 700;
  color: var(--gray-900);
}

.status-label {
  font-size: 11px;
  color: var(--gray-500);
}

.tracking-group {
  margin-bottom: 20px;
}

.group-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--gray-900);
  margin: 0 0 12px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.dot.pending {
  background: #F59E0B;
}

.dot.approved {
  background: #22C55E;
}

.dot.rejected {
  background: #EF4444;
}

/* Status Summary 2 columns สำหรับ Admin/Coach */
.status-summary.two-cols {
  grid-template-columns: repeat(2, 1fr);
}

.status-card.past {
  border-top: 3px solid var(--gray-400);
}

.status-card.past .status-icon {
  background: var(--gray-100);
  color: var(--gray-600);
}

.dot.past {
  background: var(--gray-400);
}

/* Tabs 3 columns สำหรับ Admin/Coach */
.tabs.three-tabs .tab {
  padding: 10px 8px;
  font-size: 13px;
}

.tab-badge.warning {
  background: #FEF3C7;
  color: #92400E;
}

/* Requests Content */
.requests-content {
  padding: 0 16px 16px;
}

.requests-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.request-card {
  background: var(--white);
  border-radius: 12px;
  padding: 16px;
  border: 1px solid var(--gray-200);
}

.request-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.request-icon {
  width: 40px;
  height: 40px;
  background: var(--gray-900);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.request-icon svg {
  width: 20px;
  height: 20px;
  color: var(--white);
}

.request-info {
  flex: 1;
}

.requester-name {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: var(--gray-900);
}

.facility-name {
  font-size: 13px;
  color: var(--gray-500);
}

.series-tag {
  padding: 4px 8px;
  background: var(--gray-100);
  border-radius: 6px;
  font-size: 11px;
  color: var(--gray-600);
}

.request-details {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--gray-600);
}

.detail-item svg {
  width: 16px;
  height: 16px;
}

.request-purpose {
  font-size: 13px;
  color: var(--gray-600);
  margin: 0 0 12px;
  padding: 8px;
  background: var(--gray-50);
  border-radius: 6px;
}

.request-actions {
  display: flex;
  gap: 8px;
}

.btn-approve {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 16px;
  background: #22C55E;
  color: var(--white);
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.btn-approve:hover {
  background: #16A34A;
}

.btn-approve svg {
  width: 18px;
  height: 18px;
}

.btn-reject {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 16px;
  background: var(--white);
  color: var(--gray-600);
  border: 1px solid var(--gray-200);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.btn-reject:hover {
  background: #FEE2E2;
  border-color: #FCA5A5;
  color: #991B1B;
}

.btn-reject svg {
  width: 18px;
  height: 18px;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--white);
  border-radius: 12px;
  padding: 24px;
  width: 100%;
  max-width: 400px;
  margin: 16px;
}

.modal h3 {
  font-size: 18px;
  font-weight: 600;
  color: var(--gray-900);
  margin: 0 0 4px;
}

.modal-subtitle {
  font-size: 14px;
  color: var(--gray-500);
  margin: 0 0 16px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--gray-700);
  margin-bottom: 6px;
}

.form-group textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--gray-200);
  border-radius: 8px;
  font-size: 14px;
  resize: vertical;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn-modal-cancel {
  padding: 10px 16px;
  background: var(--white);
  border: 1px solid var(--gray-200);
  border-radius: 8px;
  font-size: 14px;
  color: var(--gray-600);
  cursor: pointer;
}

.btn-modal-cancel:hover {
  background: var(--gray-50);
}

.btn-modal-reject {
  padding: 10px 16px;
  background: #EF4444;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  color: var(--white);
  cursor: pointer;
}

.btn-modal-reject:hover {
  background: #DC2626;
}

.btn-modal-reject:disabled {
  background: var(--gray-300);
  cursor: not-allowed;
}

@media (max-width: 400px) {
  .status-summary {
    grid-template-columns: 1fr;
  }
  .status-summary.two-cols {
    grid-template-columns: 1fr;
  }
  .request-details {
    flex-direction: column;
    gap: 8px;
  }
  .request-actions {
    flex-direction: column;
  }
}
</style>
