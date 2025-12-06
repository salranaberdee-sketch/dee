<template>
  <div class="facility-card" @click="$emit('click', facility)">
    <!-- รูปภาพ -->
    <div class="facility-image">
      <img v-if="facility.image_url" :src="facility.image_url" :alt="facility.name" />
      <div v-else class="image-placeholder">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21 15 16 10 5 21"/>
        </svg>
      </div>
      <!-- Badge เต็ม -->
      <span v-if="availableSlots === 0" class="full-badge">เต็ม</span>
    </div>

    <!-- ข้อมูล -->
    <div class="facility-info">
      <div class="facility-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      </div>
      <div class="facility-details">
        <h3>{{ facility.name }}</h3>
        <p class="capacity">ความจุ: {{ facility.capacity }} คน</p>
        <p v-if="availableSlots !== null" class="slots" :class="{ 'no-slots': availableSlots === 0 }">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          {{ availableSlots > 0 ? `ว่าง ${availableSlots} ช่อง` : 'ไม่มีช่องว่างวันนี้' }}
        </p>
      </div>
    </div>

    <!-- ปุ่มจอง -->
    <button class="book-btn" :disabled="availableSlots === 0">
      <span>จอง</span>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
      </svg>
    </button>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '@/lib/supabase'

/**
 * FacilityCard - การ์ดแสดงสถานที่
 * Requirements: 1.1, 1.2, 1.3
 */

const props = defineProps({
  facility: {
    type: Object,
    required: true
  }
})

defineEmits(['click'])

const availableSlots = ref(null)

// ดึงจำนวนช่องว่างวันนี้
async function fetchAvailableSlots() {
  try {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase.rpc('get_available_slots_count', {
      p_facility_id: props.facility.id,
      p_date: today
    })
    availableSlots.value = data ?? 0
  } catch (err) {
    console.error('Error fetching slots:', err)
    availableSlots.value = 0
  }
}

onMounted(() => {
  fetchAvailableSlots()
})
</script>

<style scoped>
.facility-card {
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;
}

.facility-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.facility-image {
  position: relative;
  height: 140px;
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
  width: 48px;
  height: 48px;
}

.full-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  background: #EF4444;
  color: #fff;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.facility-info {
  display: flex;
  gap: 12px;
  padding: 16px;
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

.facility-details {
  flex: 1;
  min-width: 0;
}

.facility-details h3 {
  font-size: 15px;
  font-weight: 600;
  color: #171717;
  margin: 0 0 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.capacity {
  font-size: 13px;
  color: #737373;
  margin: 0 0 4px;
}

.slots {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #22C55E;
  margin: 0;
}

.slots svg {
  width: 14px;
  height: 14px;
}

.slots.no-slots {
  color: #EF4444;
}

.book-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: calc(100% - 32px);
  margin: 0 16px 16px;
  padding: 10px;
  background: #171717;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.book-btn:hover:not(:disabled) {
  background: #262626;
}

.book-btn:disabled {
  background: #A3A3A3;
  cursor: not-allowed;
}

.book-btn svg {
  width: 16px;
  height: 16px;
}
</style>
