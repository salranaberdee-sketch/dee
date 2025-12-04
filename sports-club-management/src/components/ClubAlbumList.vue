<script setup>
/**
 * ClubAlbumList.vue - แสดงรายการชมรมพร้อมสถิติอัลบั้ม (สำหรับ Admin)
 * 
 * Requirements: 3.1, 3.2
 * - 3.1: Admin ดูรายการชมรมทั้งหมดพร้อมสถิติ
 * - 3.2: แสดงจำนวนอัลบั้ม, จำนวนไฟล์, พื้นที่ใช้งานต่อชมรม
 */
import { formatStorageSize } from '@/stores/albumManagement'

const props = defineProps({
  clubs: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['select', 'retry'])

// เลือกชมรม
function handleSelect(club) {
  emit('select', club)
}

// ลองโหลดใหม่
function handleRetry() {
  emit('retry')
}
</script>

<template>
  <div class="club-album-list">
    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="skeleton-grid">
        <div v-for="i in 4" :key="i" class="skeleton-card">
          <div class="skeleton-header">
            <div class="skeleton-icon"></div>
            <div class="skeleton-title"></div>
          </div>
          <div class="skeleton-stats">
            <div class="skeleton-stat"></div>
            <div class="skeleton-stat"></div>
            <div class="skeleton-stat"></div>
          </div>
          <div class="skeleton-action"></div>
        </div>
      </div>
    </div>

    <!-- รายการชมรม -->
    <div v-else-if="clubs.length > 0" class="clubs-grid">
      <div 
        v-for="club in clubs" 
        :key="club.id" 
        class="club-card"
        @click="handleSelect(club)"
      >
        <div class="club-header">
          <div class="club-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <h3 class="club-name">{{ club.name }}</h3>
        </div>
        
        <div class="club-stats">
          <div class="stat-item">
            <div class="stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
            </div>
            <div class="stat-content">
              <span class="stat-value">{{ club.total_albums || 0 }}</span>
              <span class="stat-label">อัลบั้ม</span>
            </div>
          </div>
          
          <div class="stat-item">
            <div class="stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
            <div class="stat-content">
              <span class="stat-value">{{ club.total_media || 0 }}</span>
              <span class="stat-label">ไฟล์</span>
            </div>
          </div>
          
          <div class="stat-item">
            <div class="stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              </svg>
            </div>
            <div class="stat-content">
              <span class="stat-value">{{ formatStorageSize(club.total_storage || 0) }}</span>
              <span class="stat-label">พื้นที่</span>
            </div>
          </div>
        </div>
        
        <div class="club-action">
          <span>ดูนักกีฬา</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <p>{{ error }}</p>
      <button class="btn btn-primary" @click="handleRetry">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="23 4 23 10 17 10"/>
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
        </svg>
        ลองใหม่
      </button>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
      <p>ไม่พบชมรม</p>
    </div>
  </div>
</template>

<style scoped>
.club-album-list {
  width: 100%;
}

/* Clubs Grid */
.clubs-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

.club-card {
  background: #fff;
  border-radius: 16px;
  border: 1px solid #E5E5E5;
  padding: 16px;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
}

.club-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.club-card:active {
  transform: translateY(0);
}

/* Club Header */
.club-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.club-icon {
  width: 44px;
  height: 44px;
  background: #171717;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.club-icon svg {
  width: 22px;
  height: 22px;
  color: #fff;
}

.club-name {
  font-size: 16px;
  font-weight: 600;
  color: #171717;
  margin: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Club Stats */
.club-stats {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.stat-item {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  background: #FAFAFA;
  border-radius: 10px;
  padding: 10px 12px;
}

.stat-icon {
  width: 28px;
  height: 28px;
  background: #fff;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-icon svg {
  width: 14px;
  height: 14px;
  color: #525252;
}

.stat-content {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.stat-value {
  font-size: 14px;
  font-weight: 600;
  color: #171717;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stat-label {
  font-size: 11px;
  color: #737373;
}

/* Club Action */
.club-action {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px;
  background: #F5F5F5;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  color: #525252;
  transition: background 0.15s, color 0.15s;
}

.club-card:hover .club-action {
  background: #171717;
  color: #fff;
}

.club-action svg {
  transition: transform 0.15s;
}

.club-card:hover .club-action svg {
  transform: translateX(2px);
}

/* Loading State */
.loading-state {
  width: 100%;
}

.skeleton-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

.skeleton-card {
  background: #fff;
  border-radius: 16px;
  border: 1px solid #E5E5E5;
  padding: 16px;
}

.skeleton-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.skeleton-icon {
  width: 44px;
  height: 44px;
  background: linear-gradient(90deg, #E5E5E5 25%, #F5F5F5 50%, #E5E5E5 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 12px;
}

.skeleton-title {
  flex: 1;
  height: 20px;
  background: linear-gradient(90deg, #E5E5E5 25%, #F5F5F5 50%, #E5E5E5 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
}

.skeleton-stats {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.skeleton-stat {
  flex: 1;
  height: 48px;
  background: linear-gradient(90deg, #E5E5E5 25%, #F5F5F5 50%, #E5E5E5 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 10px;
}

.skeleton-action {
  height: 40px;
  background: linear-gradient(90deg, #E5E5E5 25%, #F5F5F5 50%, #E5E5E5 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 10px;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Error State */
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #737373;
  text-align: center;
}

.error-state svg {
  color: #D4D4D4;
  margin-bottom: 16px;
}

.error-state p {
  margin: 0 0 20px 0;
  font-size: 15px;
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 20px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: 0.15s;
}

.btn-primary {
  background: #171717;
  color: #fff;
}

.btn-primary:hover {
  background: #262626;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #737373;
  text-align: center;
}

.empty-state svg {
  color: #D4D4D4;
  margin-bottom: 16px;
}

.empty-state p {
  margin: 0;
  font-size: 15px;
}

/* Responsive */
@media (min-width: 640px) {
  .clubs-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .skeleton-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
