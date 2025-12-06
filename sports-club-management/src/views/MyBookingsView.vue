<template>
  <div class="my-bookings-page">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h1>การจองของฉัน</h1>
        <p class="subtitle">ดูและจัดการการจองสถานที่ของคุณ</p>
      </div>
      <router-link to="/facilities" class="btn-primary">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        จองใหม่
      </router-link>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <button 
        class="tab" 
        :class="{ active: activeTab === 'tracking' }"
        @click="activeTab = 'tracking'"
      >
        ติดตามสถานะ
        <span v-if="pendingMyBookings.length" class="tab-badge pending">{{ pendingMyBookings.length }}</span>
      </button>
      <button 
        class="tab" 
        :class="{ active: activeTab === 'upcoming' }"
        @click="activeTab = 'upcoming'"
      >
        กำลังจะมาถึง
        <span v-if="upcomingBookings.length" class="tab-badge">{{ upcomingBookings.length }}</span>
      </button>
      <button 
        class="tab" 
        :class="{ active: activeTab === 'past' }"
        @click="activeTab = 'past'"
      >
        ผ่านมาแล้ว
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading">
      <div class="loading-spinner"></div>
      <span>กำลังโหลด...</span>
    </div>

    <!-- Content -->
    <template v-else>
      <!-- Tracking - ติดตามสถานะคำขอ -->
      <div v-if="activeTab === 'tracking'" class="tracking-section">
        <!-- สรุปสถานะ -->
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

        <!-- รายการถูกปฏิเสธล่าสุด -->
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
        <div v-if="pendingMyBookings.length === 0 && rejectedBookings.length === 0" class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          <p>ไม่มีคำขอที่ต้องติดตาม</p>
          <router-link to="/facilities" class="btn-secondary">จองสถานที่</router-link>
        </div>
      </div>

      <!-- Upcoming -->
      <div v-if="activeTab === 'upcoming'" class="bookings-list">
        <div v-if="upcomingBookings.length === 0" class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <p>ไม่มีการจองที่กำลังจะมาถึง</p>
          <router-link to="/facilities" class="btn-secondary">จองสถานที่</router-link>
        </div>
        <BookingCard 
          v-for="booking in upcomingBookings" 
          :key="booking.id"
          :booking="booking"
          :show-actions="false"
        />
      </div>

      <!-- Past -->
      <div v-if="activeTab === 'past'" class="bookings-list">
        <div v-if="pastBookings.length === 0" class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          <p>ไม่มีประวัติการจอง</p>
        </div>
        <BookingCard 
          v-for="booking in pastBookings" 
          :key="booking.id"
          :booking="booking"
          :show-actions="false"
        />
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useFacilityStore } from '@/stores/facility'
import BookingCard from '@/components/BookingCard.vue'

/**
 * MyBookingsView - หน้าการจองของฉัน
 * Requirements: 3.1, 3.2, 3.3
 */

const facilityStore = useFacilityStore()
const { loading, upcomingBookings, pendingMyBookings, pastBookings } = storeToRefs(facilityStore)

// คำนวณรายการที่ถูกปฏิเสธ
const rejectedBookings = computed(() => 
  pastBookings.value.filter(b => b.status === 'rejected')
)

const activeTab = ref('tracking')

async function handleCancel(bookingId) {
  if (!confirm('ต้องการยกเลิกการจองนี้?')) return
  
  const result = await facilityStore.cancelBooking(bookingId)
  if (result.success) {
    alert('ยกเลิกการจองเรียบร้อยแล้ว')
  } else {
    alert(result.message || 'ไม่สามารถยกเลิกได้')
  }
}

async function handleCancelSeries(seriesId) {
  if (!confirm('ต้องการยกเลิกการจองทั้ง series?')) return
  
  const result = await facilityStore.cancelRecurringSeries(seriesId)
  if (result.success) {
    alert('ยกเลิกการจองทั้ง series เรียบร้อยแล้ว')
  } else {
    alert(result.message || 'ไม่สามารถยกเลิกได้')
  }
}

onMounted(() => {
  facilityStore.fetchMyBookings()
})
</script>

<style scoped>
.my-bookings-page {
  padding: 24px;
  max-width: 800px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
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

.btn-primary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
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

.btn-primary svg {
  width: 18px;
  height: 18px;
}

.tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 20px;
  padding: 4px;
  background: #F5F5F5;
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
  color: #525252;
  cursor: pointer;
  transition: all 0.2s;
}

.tab:hover {
  color: #171717;
}

.tab.active {
  background: #fff;
  color: #171717;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.tab-badge {
  padding: 2px 8px;
  background: #E5E5E5;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
}

.tab.active .tab-badge {
  background: #171717;
  color: #fff;
}

.tab-badge.pending {
  background: #FEF3C7;
  color: #92400E;
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

.bookings-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.empty-state {
  text-align: center;
  padding: 48px 24px;
  color: #737373;
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 12px;
}

.empty-state svg {
  width: 48px;
  height: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.empty-state p {
  margin: 0 0 16px;
  font-size: 14px;
  color: #525252;
}

.btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  font-size: 14px;
  color: #171717;
  text-decoration: none;
}

.btn-secondary:hover {
  background: #F5F5F5;
}

/* Tracking Section */
.tracking-section {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.status-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.status-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 12px;
}

.status-card.pending {
  border-left: 4px solid #F59E0B;
}

.status-card.approved {
  border-left: 4px solid #22C55E;
}

.status-card.rejected {
  border-left: 4px solid #EF4444;
}

.status-icon {
  width: 40px;
  height: 40px;
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
  width: 20px;
  height: 20px;
}

.status-info {
  display: flex;
  flex-direction: column;
}

.status-count {
  font-size: 24px;
  font-weight: 700;
  color: #171717;
}

.status-label {
  font-size: 12px;
  color: #737373;
}

.tracking-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.group-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #171717;
  margin: 0;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.dot.pending {
  background: #F59E0B;
}

.dot.rejected {
  background: #EF4444;
}

@media (max-width: 768px) {
  .my-bookings-page {
    padding: 16px;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .tabs {
    overflow-x: auto;
  }

  .tab {
    white-space: nowrap;
  }

  .status-summary {
    grid-template-columns: 1fr;
  }
}
</style>
