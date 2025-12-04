<template>
  <div class="registration-stats">
    <!-- Total Registered Card -->
    <div class="stat-card stat-total">
      <div class="card-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
        </svg>
      </div>
      <div class="stat-content">
        <div class="stat-value">{{ stats.totalRegistered }}</div>
        <div class="stat-label">ผู้เข้าแข่งขันทั้งหมด</div>
        <div v-if="stats.remainingSlots !== null" class="stat-slots">
          <span class="slots-label">เหลือ</span>
          <span :class="['slots-value', { 'slots-low': stats.remainingSlots <= 5 }]">
            {{ stats.remainingSlots }}
          </span>
          <span class="slots-label">ที่</span>
        </div>
      </div>
    </div>

    <!-- Status Breakdown -->
    <div class="stat-card stat-status">
      <div class="card-header">
        <div class="card-icon-sm">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>
        <span class="card-title">สถานะการลงทะเบียน</span>
      </div>
      <div class="status-grid">
        <div class="status-item">
          <span class="status-badge status-pending">รอยืนยัน</span>
          <span class="status-count">{{ stats.byStatus.pending }}</span>
        </div>
        <div class="status-item">
          <span class="status-badge status-approved">อนุมัติ</span>
          <span class="status-count">{{ stats.byStatus.approved }}</span>
        </div>
        <div class="status-item">
          <span class="status-badge status-rejected">ปฏิเสธ</span>
          <span class="status-count">{{ stats.byStatus.rejected }}</span>
        </div>
        <div class="status-item">
          <span class="status-badge status-withdrawn">ถอนตัว</span>
          <span class="status-count">{{ stats.byStatus.withdrawn }}</span>
        </div>
      </div>
    </div>

    <!-- Category Breakdown -->
    <div class="stat-card stat-category">
      <div class="card-header">
        <div class="card-icon-sm">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="8" y1="6" x2="21" y2="6"/>
            <line x1="8" y1="12" x2="21" y2="12"/>
            <line x1="8" y1="18" x2="21" y2="18"/>
            <line x1="3" y1="6" x2="3.01" y2="6"/>
            <line x1="3" y1="12" x2="3.01" y2="12"/>
            <line x1="3" y1="18" x2="3.01" y2="18"/>
          </svg>
        </div>
        <span class="card-title">จำนวนตามรุ่น</span>
      </div>
      <div v-if="categoryList.length === 0" class="empty-category">
        ยังไม่มีข้อมูลรุ่น
      </div>
      <div v-else class="category-list">
        <div 
          v-for="cat in categoryList" 
          :key="cat.category" 
          class="category-item"
        >
          <span class="category-name">{{ cat.displayName }}</span>
          <span class="category-count">{{ cat.count }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { calculateRegistrationStats, categoryMapToArray } from '@/lib/tournamentUtils'

/**
 * RegistrationStats Component
 * 
 * แสดงสถิติการลงทะเบียนของทัวนาเมนต์
 * - จำนวนผู้เข้าแข่งขันทั้งหมด
 * - จำนวนที่เหลือ (ถ้ามี max_participants)
 * - แยกตามสถานะ (pending, approved, rejected, withdrawn)
 * - แยกตามรุ่น/ประเภท
 * 
 * Property 15: Statistics count accuracy - ผลรวมของ status breakdown ต้องเท่ากับ total
 * Property 16: Remaining slots calculation - remaining = max - current
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4
 */

const props = defineProps({
  // รายการผู้เข้าแข่งขัน
  participants: {
    type: Array,
    required: true,
    default: () => []
  },
  // จำนวนผู้เข้าแข่งขันสูงสุด (null = ไม่จำกัด)
  maxParticipants: {
    type: Number,
    default: null
  }
})

/**
 * คำนวณสถิติการลงทะเบียน
 * ใช้ฟังก์ชัน calculateRegistrationStats จาก tournamentUtils
 */
const stats = computed(() => {
  return calculateRegistrationStats(props.participants, props.maxParticipants)
})

/**
 * แปลง Map ของ category เป็น Array สำหรับแสดงผล
 * เรียงลำดับตามชื่อ โดย uncategorized ไว้ท้าย
 */
const categoryList = computed(() => {
  const list = categoryMapToArray(stats.value.byCategory)
  
  // เรียงลำดับ: รุ่นที่มีชื่อก่อน, uncategorized ไว้ท้าย
  return list.sort((a, b) => {
    if (a.category === 'uncategorized') return 1
    if (b.category === 'uncategorized') return -1
    return a.category.localeCompare(b.category, 'th')
  })
})
</script>

<style scoped>
.registration-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

/* Stat Card Base */
.stat-card {
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 12px;
  padding: 16px;
}

/* Total Card */
.stat-total {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.card-icon {
  width: 48px;
  height: 48px;
  background: #171717;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.card-icon svg {
  width: 24px;
  height: 24px;
  color: #fff;
}

.stat-content {
  flex: 1;
  min-width: 0;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: #171717;
  line-height: 1;
}

.stat-label {
  font-size: 13px;
  color: #737373;
  margin-top: 4px;
}

.stat-slots {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
  font-size: 13px;
}

.slots-label {
  color: #737373;
}

.slots-value {
  font-weight: 600;
  color: #171717;
  background: #F5F5F5;
  padding: 2px 8px;
  border-radius: 4px;
}

.slots-value.slots-low {
  background: #FEE2E2;
  color: #991B1B;
}

/* Card Header */
.card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.card-icon-sm {
  width: 32px;
  height: 32px;
  background: #171717;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.card-icon-sm svg {
  width: 16px;
  height: 16px;
  color: #fff;
}

.card-title {
  font-size: 14px;
  font-weight: 600;
  color: #171717;
}

/* Status Grid */
.status-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 10px;
  background: #FAFAFA;
  border-radius: 6px;
}

.status-badge {
  font-size: 11px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 10px;
}

.status-pending {
  background: #FEF3C7;
  color: #92400E;
}

.status-approved {
  background: #D1FAE5;
  color: #065F46;
}

.status-rejected {
  background: #FEE2E2;
  color: #991B1B;
}

.status-withdrawn {
  background: #F3F4F6;
  color: #374151;
}

.status-count {
  font-size: 14px;
  font-weight: 600;
  color: #171717;
}

/* Category List */
.empty-category {
  text-align: center;
  padding: 16px;
  color: #737373;
  font-size: 13px;
}

.category-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 150px;
  overflow-y: auto;
}

.category-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 10px;
  background: #FAFAFA;
  border-radius: 6px;
}

.category-name {
  font-size: 13px;
  color: #525252;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.category-count {
  font-size: 13px;
  font-weight: 600;
  color: #171717;
  background: #171717;
  color: #fff;
  padding: 2px 8px;
  border-radius: 10px;
  min-width: 24px;
  text-align: center;
}

/* Mobile Responsive - Card Layout */
@media (max-width: 640px) {
  .registration-stats {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  /* Stat Card Base - touch-friendly */
  .stat-card {
    padding: 18px;
    border-radius: 14px;
  }

  /* Total Card - Centered layout */
  .stat-total {
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 14px;
  }
  
  .card-icon {
    width: 56px;
    height: 56px;
    border-radius: 14px;
  }
  
  .card-icon svg {
    width: 28px;
    height: 28px;
  }

  .stat-content {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  
  .stat-value {
    font-size: 40px;
  }
  
  .stat-label {
    font-size: 14px;
    margin-top: 6px;
  }

  .stat-slots {
    justify-content: center;
    margin-top: 10px;
    font-size: 14px;
  }
  
  .slots-value {
    padding: 4px 10px;
    font-size: 15px;
  }

  /* Card Header */
  .card-header {
    margin-bottom: 14px;
  }
  
  .card-icon-sm {
    width: 36px;
    height: 36px;
    border-radius: 10px;
  }
  
  .card-icon-sm svg {
    width: 18px;
    height: 18px;
  }
  
  .card-title {
    font-size: 15px;
  }

  /* Status Grid - Single column */
  .status-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  
  .status-item {
    padding: 12px 14px;
    border-radius: 10px;
    min-height: 48px;
  }
  
  .status-badge {
    font-size: 13px;
    padding: 4px 10px;
  }
  
  .status-count {
    font-size: 16px;
  }

  /* Category List */
  .empty-category {
    padding: 20px;
    font-size: 14px;
  }
  
  .category-list {
    gap: 8px;
    max-height: 180px;
  }
  
  .category-item {
    padding: 12px 14px;
    border-radius: 10px;
    min-height: 48px;
  }
  
  .category-name {
    font-size: 14px;
  }
  
  .category-count {
    font-size: 14px;
    padding: 4px 10px;
    min-width: 28px;
  }
}

/* Tablet - 2 columns */
@media (min-width: 641px) and (max-width: 1024px) {
  .registration-stats {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .stat-total {
    grid-column: span 2;
  }
  
  .stat-card {
    padding: 18px;
  }
  
  .status-item,
  .category-item {
    min-height: 44px;
  }
}
</style>
