<template>
  <div class="status-banner" :class="status">
    <div class="banner-content">
      <!-- Icon -->
      <svg v-if="status === 'active'" class="banner-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
      <svg v-else-if="status === 'inactive'" class="banner-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
      <svg v-else class="banner-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      
      <!-- Text (1 line only) -->
      <span class="banner-text">{{ bannerText }}</span>
    </div>
    
    <!-- Action Button -->
    <button v-if="actionText" class="banner-action" @click="$emit('action')">
      {{ actionText }}
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  status: {
    type: String,
    required: true,
    validator: (value) => ['active', 'inactive', 'none'].includes(value)
  }
})

defineEmits(['action'])

// ข้อความแบนเนอร์ (max 1 line)
const bannerText = computed(() => {
  const texts = {
    active: '✓ พร้อมใช้งาน',
    inactive: '⚠ ยังไม่เปิดใช้งาน',
    none: 'เริ่มต้นใช้งาน'
  }
  return texts[props.status] || ''
})

// ปุ่ม action
// หมายเหตุ: เมื่อ status = 'none' จะแสดง FirstTimeSetup อยู่แล้ว
// ดังนั้นไม่ต้องแสดงปุ่ม "ตั้งค่าเลย" ซ้ำ
const actionText = computed(() => {
  const actions = {
    active: null,
    inactive: 'เปิดใช้งาน',
    none: null // ซ่อนปุ่มเพราะ FirstTimeSetup แสดงอยู่แล้ว
  }
  return actions[props.status]
})
</script>

<style scoped>
.status-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
}

/* Active - Green */
.status-banner.active {
  background: #D1FAE5;
  border: 1px solid #A7F3D0;
}

.status-banner.active .banner-icon,
.status-banner.active .banner-text {
  color: #065F46;
}

/* Inactive - Yellow */
.status-banner.inactive {
  background: #FEF3C7;
  border: 1px solid #FDE68A;
}

.status-banner.inactive .banner-icon,
.status-banner.inactive .banner-text {
  color: #92400E;
}

/* None - Gray */
.status-banner.none {
  background: #F5F5F5;
  border: 1px solid #E5E5E5;
}

.status-banner.none .banner-icon,
.status-banner.none .banner-text {
  color: #525252;
}

/* Content */
.banner-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.banner-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.banner-text {
  font-size: 0.875rem;
  font-weight: 500;
  white-space: nowrap;
}

/* Action Button */
.banner-action {
  padding: 0.4rem 0.75rem;
  background: #171717;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
}

.banner-action:hover {
  background: #404040;
}

/* Responsive */
@media (max-width: 640px) {
  .status-banner {
    padding: 0.6rem 0.75rem;
  }
  
  .banner-text {
    font-size: 0.8rem;
  }
  
  .banner-action {
    padding: 0.35rem 0.6rem;
    font-size: 0.75rem;
  }
}
</style>
