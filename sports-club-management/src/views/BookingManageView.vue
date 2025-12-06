<template>
  <div class="booking-manage-page">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h1>จัดการคำขอจอง</h1>
        <p class="subtitle">อนุมัติหรือปฏิเสธคำขอจองสถานที่</p>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading">
      <div class="loading-spinner"></div>
      <span>กำลังโหลด...</span>
    </div>

    <!-- Empty State -->
    <div v-else-if="pendingBookings.length === 0" class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
      <p>ไม่มีคำขอที่รออนุมัติ</p>
    </div>

    <!-- Pending Bookings List -->
    <div v-else class="bookings-list">
      <div 
        v-for="booking in pendingBookings" 
        :key="booking.id" 
        class="booking-item"
        :class="{ 'is-series': booking.series_id }"
      >
        <!-- Booking Info -->
        <div class="booking-info">
          <div class="facility-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <div class="info-content">
            <h3>{{ booking.facility?.name || 'สถานที่' }}</h3>
            <p class="athlete-name">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              {{ booking.athlete?.name || 'นักกีฬา' }}
            </p>
            <div class="booking-details">
              <span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                {{ formatDate(booking.booking_date) }}
              </span>
              <span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                {{ formatTime(booking.start_time) }} - {{ formatTime(booking.end_time) }}
              </span>
            </div>
            <p v-if="booking.purpose" class="purpose">{{ booking.purpose }}</p>
            <span v-if="booking.series_id" class="series-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/>
                <polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/>
              </svg>
              จองซ้ำ
            </span>
          </div>
        </div>

        <!-- Actions -->
        <div class="booking-actions">
          <button class="btn-approve" @click="handleApprove(booking)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            อนุมัติ
          </button>
          <button 
            v-if="booking.series_id" 
            class="btn-approve-series" 
            @click="handleApproveSeries(booking.series_id)"
          >
            อนุมัติทั้ง series
          </button>
          <button class="btn-reject" @click="openRejectModal(booking)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
            ปฏิเสธ
          </button>
        </div>
      </div>
    </div>

    <!-- Reject Modal -->
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
          <button class="btn-secondary" @click="closeRejectModal">ยกเลิก</button>
          <button 
            class="btn-reject" 
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
import { ref, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useFacilityStore } from '@/stores/facility'

/**
 * BookingManageView - หน้าจัดการคำขอจอง (Coach/Admin)
 * Requirements: 4.1, 4.2, 4.3, 4.5, 4.6
 */

const facilityStore = useFacilityStore()
const { loading, pendingBookings } = storeToRefs(facilityStore)

// State
const showRejectModal = ref(false)
const selectedBooking = ref(null)
const rejectReason = ref('')

// Helpers
function formatDate(date) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('th-TH', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

function formatTime(time) {
  if (!time) return '-'
  return time.substring(0, 5)
}

// Actions
async function handleApprove(booking) {
  if (!confirm('ต้องการอนุมัติคำขอนี้?')) return
  
  const result = await facilityStore.approveBooking(booking.id)
  if (result.success) {
    alert('อนุมัติเรียบร้อยแล้ว')
  } else {
    alert(result.message || 'ไม่สามารถอนุมัติได้')
  }
}

async function handleApproveSeries(seriesId) {
  if (!confirm('ต้องการอนุมัติคำขอทั้ง series?')) return
  
  const result = await facilityStore.approveRecurringSeries(seriesId)
  if (result.success) {
    alert('อนุมัติทั้ง series เรียบร้อยแล้ว')
  } else {
    alert(result.message || 'ไม่สามารถอนุมัติได้')
  }
}

function openRejectModal(booking) {
  selectedBooking.value = booking
  rejectReason.value = ''
  showRejectModal.value = true
}

function closeRejectModal() {
  showRejectModal.value = false
  selectedBooking.value = null
  rejectReason.value = ''
}

async function confirmReject() {
  if (!rejectReason.value.trim()) {
    alert('กรุณาระบุเหตุผล')
    return
  }

  const result = await facilityStore.rejectBooking(
    selectedBooking.value.id, 
    rejectReason.value
  )
  
  if (result.success) {
    alert('ปฏิเสธเรียบร้อยแล้ว')
    closeRejectModal()
  } else {
    alert(result.message || 'ไม่สามารถปฏิเสธได้')
  }
}

onMounted(() => {
  facilityStore.fetchPendingBookings()
})
</script>

<style scoped>
.booking-manage-page {
  padding: 24px;
  max-width: 900px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h1 {
  font-size: 24px;
  font-weight: 600;
  color: #171717;
  margin: 0;
}

.subtitle {
  color: #737373;
  margin: 4px 0 0;
  font-size: 14px;
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

.empty-state {
  text-align: center;
  padding: 64px 24px;
  color: #737373;
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 12px;
}

.empty-state svg {
  width: 64px;
  height: 64px;
  margin-bottom: 16px;
  opacity: 0.5;
  color: #22C55E;
}

.empty-state p {
  margin: 0;
  font-size: 16px;
  color: #525252;
}

.bookings-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.booking-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  padding: 16px;
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 12px;
}

.booking-item.is-series {
  border-left: 3px solid #171717;
}

.booking-info {
  display: flex;
  gap: 12px;
  flex: 1;
}

.facility-icon {
  width: 44px;
  height: 44px;
  background: #171717;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.facility-icon svg {
  width: 22px;
  height: 22px;
  color: #fff;
}

.info-content h3 {
  font-size: 15px;
  font-weight: 600;
  color: #171717;
  margin: 0 0 4px;
}

.athlete-name {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #525252;
  margin: 0 0 8px;
}

.athlete-name svg {
  width: 14px;
  height: 14px;
}

.booking-details {
  display: flex;
  gap: 12px;
  margin-bottom: 8px;
}

.booking-details span {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #737373;
}

.booking-details svg {
  width: 14px;
  height: 14px;
}

.purpose {
  font-size: 13px;
  color: #525252;
  margin: 0 0 8px;
  padding: 6px 8px;
  background: #FAFAFA;
  border-radius: 4px;
}

.series-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: #F5F5F5;
  border-radius: 6px;
  font-size: 11px;
  color: #525252;
}

.series-badge svg {
  width: 12px;
  height: 12px;
}

.booking-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.btn-approve {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 16px;
  background: #22C55E;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-approve:hover {
  background: #16A34A;
}

.btn-approve svg {
  width: 16px;
  height: 16px;
}

.btn-approve-series {
  padding: 8px 16px;
  background: #fff;
  border: 1px solid #22C55E;
  border-radius: 6px;
  font-size: 13px;
  color: #22C55E;
  cursor: pointer;
}

.btn-approve-series:hover {
  background: #F0FDF4;
}

.btn-reject {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 16px;
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 6px;
  font-size: 13px;
  color: #525252;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-reject:hover {
  background: #FEE2E2;
  border-color: #FCA5A5;
  color: #991B1B;
}

.btn-reject svg {
  width: 16px;
  height: 16px;
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
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  width: 100%;
  max-width: 400px;
  margin: 16px;
}

.modal h3 {
  font-size: 18px;
  font-weight: 600;
  color: #171717;
  margin: 0 0 4px;
}

.modal-subtitle {
  font-size: 14px;
  color: #737373;
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

.form-group textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  font-size: 14px;
  resize: vertical;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn-secondary {
  padding: 10px 16px;
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  font-size: 14px;
  color: #525252;
  cursor: pointer;
}

.btn-secondary:hover {
  background: #F5F5F5;
}

.modal .btn-reject {
  background: #EF4444;
  border-color: #EF4444;
  color: #fff;
}

.modal .btn-reject:hover {
  background: #DC2626;
}

.modal .btn-reject:disabled {
  background: #A3A3A3;
  border-color: #A3A3A3;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .booking-manage-page {
    padding: 16px;
  }

  .booking-item {
    flex-direction: column;
  }

  .booking-actions {
    flex-direction: row;
    width: 100%;
  }

  .booking-actions button {
    flex: 1;
  }
}
</style>
