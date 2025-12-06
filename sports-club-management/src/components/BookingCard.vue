<template>
  <div class="booking-card" :class="{ 'is-series': booking.series_id }">
    <!-- Header -->
    <div class="booking-header">
      <div class="facility-info">
        <div class="facility-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </div>
        <div>
          <h4>{{ booking.facility?.name || 'สถานที่' }}</h4>
          <BookingStatusBadge :status="booking.status" />
        </div>
      </div>
      <span v-if="booking.series_id" class="series-badge">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/>
          <polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/>
        </svg>
        จองซ้ำ
      </span>
    </div>

    <!-- Details -->
    <div class="booking-details">
      <div class="detail-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <span>{{ formatDate(booking.booking_date) }}</span>
      </div>
      <div class="detail-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
        <span>{{ formatTime(booking.start_time) }} - {{ formatTime(booking.end_time) }}</span>
      </div>
    </div>

    <!-- Purpose -->
    <p v-if="booking.purpose" class="booking-purpose">{{ booking.purpose }}</p>

    <!-- Rejection Reason -->
    <div v-if="booking.status === 'rejected' && booking.rejection_reason" class="rejection-reason">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <span>{{ booking.rejection_reason }}</span>
    </div>

    <!-- Actions -->
    <div v-if="showActions && booking.status === 'pending'" class="booking-actions">
      <button class="btn-cancel" @click="$emit('cancel', booking.id)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
        ยกเลิก
      </button>
      <button 
        v-if="booking.series_id" 
        class="btn-cancel-series" 
        @click="$emit('cancel-series', booking.series_id)"
      >
        ยกเลิกทั้ง series
      </button>
    </div>
  </div>
</template>

<script setup>
import BookingStatusBadge from './BookingStatusBadge.vue'

/**
 * BookingCard - การ์ดแสดงข้อมูลการจอง
 * Requirements: 3.2, 3.3
 */

defineProps({
  booking: {
    type: Object,
    required: true
  },
  showActions: {
    type: Boolean,
    default: true
  }
})

defineEmits(['cancel', 'cancel-series'])

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
</script>

<style scoped>
.booking-card {
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 12px;
  padding: 16px;
}

.booking-card.is-series {
  border-left: 3px solid #171717;
}

.booking-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.facility-info {
  display: flex;
  gap: 12px;
}

.facility-icon {
  width: 40px;
  height: 40px;
  background: #171717;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.facility-icon svg {
  width: 20px;
  height: 20px;
  color: #fff;
}

.facility-info h4 {
  font-size: 15px;
  font-weight: 600;
  color: #171717;
  margin: 0 0 6px;
}

.series-badge {
  display: flex;
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

.booking-details {
  display: flex;
  gap: 16px;
  margin-bottom: 8px;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #525252;
}

.detail-item svg {
  width: 14px;
  height: 14px;
  color: #A3A3A3;
}

.booking-purpose {
  font-size: 13px;
  color: #737373;
  margin: 8px 0 0;
  padding: 8px;
  background: #FAFAFA;
  border-radius: 6px;
}

.rejection-reason {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-top: 12px;
  padding: 10px;
  background: #FEE2E2;
  border-radius: 8px;
  font-size: 13px;
  color: #991B1B;
}

.rejection-reason svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  margin-top: 1px;
}

.booking-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #F5F5F5;
}

.btn-cancel {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 6px;
  font-size: 13px;
  color: #525252;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel:hover {
  background: #FEE2E2;
  border-color: #FCA5A5;
  color: #991B1B;
}

.btn-cancel svg {
  width: 14px;
  height: 14px;
}

.btn-cancel-series {
  padding: 8px 12px;
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 6px;
  font-size: 13px;
  color: #525252;
  cursor: pointer;
}

.btn-cancel-series:hover {
  background: #F5F5F5;
}
</style>
