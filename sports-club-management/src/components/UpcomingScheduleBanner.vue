<script setup>
/**
 * UpcomingScheduleBanner.vue
 * แบนเนอร์แสดงนัดหมายถัดไปที่โดดเด่น
 * 
 * Requirements: 1.3, 2.3, 4.1, 4.2, 4.3, 4.4
 */
import { computed } from 'vue'
import { getDateLabel, formatTime } from '@/lib/scheduleUtils'

// Props
const props = defineProps({
  // นัดหมายที่จะแสดง (null = ไม่แสดงแบนเนอร์)
  schedule: {
    type: Object,
    default: null
  }
})

// Emits
const emit = defineEmits(['click'])

// Computed: label สำหรับวันที่ (วันนี้, พรุ่งนี้, ชื่อวัน, หรือวันที่)
const dateLabel = computed(() => {
  if (!props.schedule?.date) return ''
  return getDateLabel(props.schedule.date)
})

// Computed: เวลาในรูปแบบ 24 ชั่วโมง
const formattedTime = computed(() => {
  if (!props.schedule?.time) return ''
  return formatTime(props.schedule.time)
})

// Computed: สถานที่
const location = computed(() => {
  return props.schedule?.location || ''
})

// Computed: ชื่อนัดหมาย
const title = computed(() => {
  return props.schedule?.title || ''
})

// Handler: คลิกที่แบนเนอร์
function handleClick() {
  emit('click')
}
</script>

<template>
  <!-- ซ่อน component เมื่อไม่มี schedule (Requirements: 1.2, 2.2) -->
  <div 
    v-if="schedule" 
    class="upcoming-banner"
    @click="handleClick"
    role="button"
    tabindex="0"
    @keydown.enter="handleClick"
    @keydown.space.prevent="handleClick"
  >
    <!-- Calendar SVG Icon (Requirements: 4.2) -->
    <div class="banner-icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="4" width="18" height="18" rx="2"/>
        <path d="M16 2v4M8 2v4M3 10h18"/>
      </svg>
    </div>
    
    <!-- Content: date label, title, time, location (Requirements: 1.3, 2.3) -->
    <div class="banner-content">
      <span class="banner-date-label">{{ dateLabel }}</span>
      <span class="banner-title">{{ title }}</span>
      <span class="banner-details">{{ formattedTime }}<template v-if="location"> · {{ location }}</template></span>
    </div>
    
    <!-- Arrow indicator -->
    <div class="banner-arrow">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    </div>
  </div>
</template>

<style scoped>
/* 
 * แบนเนอร์นัดหมายถัดไป
 * Requirements: 4.1 (dark background gray-900, white text)
 * Requirements: 4.3 (rounded corners border-radius-lg)
 * Requirements: 4.4 (hover/active states)
 */
.upcoming-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--gray-900);
  color: white;
  padding: 16px;
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all 0.15s ease;
}

/* Hover state (Requirements: 4.4) */
.upcoming-banner:hover {
  background: var(--gray-800);
}

/* Active state (Requirements: 4.4) */
.upcoming-banner:active {
  opacity: 0.95;
  transform: scale(0.99);
}

/* Focus state for accessibility */
.upcoming-banner:focus {
  outline: 2px solid var(--gray-400);
  outline-offset: 2px;
}

/* Calendar icon container (Requirements: 4.2) */
.banner-icon {
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.banner-icon svg {
  width: 22px;
  height: 22px;
}

/* Content area */
.banner-content {
  flex: 1;
  min-width: 0;
}

/* Date label (วันนี้, พรุ่งนี้, etc.) */
.banner-date-label {
  display: block;
  font-size: 11px;
  opacity: 0.8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Title */
.banner-title {
  display: block;
  font-size: 16px;
  font-weight: 600;
  margin: 2px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Time and location details */
.banner-details {
  display: block;
  font-size: 13px;
  opacity: 0.9;
}

/* Arrow indicator */
.banner-arrow {
  flex-shrink: 0;
  opacity: 0.6;
}

.banner-arrow svg {
  width: 20px;
  height: 20px;
}
</style>
