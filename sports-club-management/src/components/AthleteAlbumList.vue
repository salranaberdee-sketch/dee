<script setup>
/**
 * AthleteAlbumList.vue - แสดงรายการนักกีฬาพร้อมสถิติอัลบั้ม
 * 
 * Requirements: 1.1, 1.3, 1.4, 1.5, 2.1, 2.4, 6.1, 6.2, 6.3, 6.4
 * - 1.1: Coach ดูรายการนักกีฬาในชมรมพร้อมจำนวนอัลบั้ม
 * - 1.3: แสดงชื่อและรูปโปรไฟล์นักกีฬา
 * - 1.4: เรียงตามชื่อ A-Z
 * - 1.5: แสดงข้อความเมื่อไม่มีอัลบั้ม
 * - 2.1: มี search input
 * - 2.4: แสดงข้อความเมื่อไม่พบผลการค้นหา
 * - 6.1, 6.2, 6.3: แสดงสถิติ album_count, media_count, storage_used
 * - 6.4: แสดงขนาดพื้นที่ในรูปแบบที่อ่านง่าย
 */
import { formatStorageSize } from '@/stores/albumManagement'
import UserAvatar from '@/components/UserAvatar.vue'

const props = defineProps({
  athletes: {
    type: Array,
    default: () => []
  },
  searchQuery: {
    type: String,
    default: ''
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

// เลือกนักกีฬา
function handleSelect(athlete) {
  emit('select', athlete)
}

// ลองโหลดใหม่
function handleRetry() {
  emit('retry')
}
</script>

<template>
  <div class="athlete-album-list">
    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="skeleton-list">
        <div v-for="i in 5" :key="i" class="skeleton-athlete">
          <div class="skeleton-avatar"></div>
          <div class="skeleton-info">
            <div class="skeleton-name"></div>
            <div class="skeleton-stats"></div>
          </div>
          <div class="skeleton-storage"></div>
        </div>
      </div>
    </div>

    <!-- รายการนักกีฬา -->
    <div v-else-if="athletes.length > 0" class="athletes-list">
      <div 
        v-for="athlete in athletes" 
        :key="athlete.id" 
        class="athlete-card"
        @click="handleSelect(athlete)"
      >
        <div class="athlete-info">
          <UserAvatar 
            :avatar-url="athlete.avatar_url"
            :user-name="athlete.full_name || athlete.name || ''"
            size="md"
            class="athlete-avatar"
          />
          <div class="athlete-details">
            <h3 class="athlete-name">{{ athlete.full_name || athlete.name }}</h3>
            <div class="athlete-stats-inline">
              <span class="stat-badge">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
                {{ athlete.album_count || 0 }} อัลบั้ม
              </span>
              <span class="stat-badge">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
                {{ athlete.media_count || 0 }} ไฟล์
              </span>
            </div>
          </div>
        </div>
        
        <div class="athlete-storage">
          <span class="storage-value">{{ formatStorageSize(athlete.storage_used || 0) }}</span>
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

    <!-- Empty State: ไม่พบผลการค้นหา -->
    <div v-else-if="searchQuery" class="empty-state">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="11" cy="11" r="8"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <p>ไม่พบผลลัพธ์ที่ตรงกับ "{{ searchQuery }}"</p>
      <span class="empty-hint">ลองค้นหาด้วยคำอื่น</span>
    </div>

    <!-- Empty State: ไม่มีนักกีฬา -->
    <div v-else class="empty-state">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87m-4-12a4 4 0 010 7.75"/>
      </svg>
      <p>ไม่พบนักกีฬาในชมรมนี้</p>
    </div>
  </div>
</template>

<style scoped>
.athlete-album-list {
  width: 100%;
}

/* Athletes List */
.athletes-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.athlete-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border-radius: 14px;
  border: 1px solid #E5E5E5;
  padding: 14px 16px;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
}

.athlete-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}

.athlete-card:active {
  transform: translateY(0);
}

/* Athlete Info */
.athlete-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.athlete-avatar {
  flex-shrink: 0;
}

.athlete-details {
  flex: 1;
  min-width: 0;
}

.athlete-name {
  font-size: 15px;
  font-weight: 600;
  color: #171717;
  margin: 0 0 4px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.athlete-stats-inline {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.stat-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #737373;
}

.stat-badge svg {
  color: #A3A3A3;
}

/* Athlete Storage */
.athlete-storage {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.storage-value {
  font-size: 13px;
  font-weight: 500;
  color: #525252;
  background: #F5F5F5;
  padding: 4px 10px;
  border-radius: 6px;
}

.athlete-storage svg {
  color: #A3A3A3;
  transition: transform 0.15s;
}

.athlete-card:hover .athlete-storage svg {
  transform: translateX(2px);
  color: #525252;
}

/* Loading State */
.loading-state {
  width: 100%;
}

.skeleton-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skeleton-athlete {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #fff;
  border-radius: 14px;
  border: 1px solid #E5E5E5;
  padding: 14px 16px;
}

.skeleton-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(90deg, #E5E5E5 25%, #F5F5F5 50%, #E5E5E5 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  flex-shrink: 0;
}

.skeleton-info {
  flex: 1;
  min-width: 0;
}

.skeleton-name {
  height: 18px;
  width: 60%;
  background: linear-gradient(90deg, #E5E5E5 25%, #F5F5F5 50%, #E5E5E5 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
  margin-bottom: 8px;
}

.skeleton-stats {
  height: 14px;
  width: 80%;
  background: linear-gradient(90deg, #E5E5E5 25%, #F5F5F5 50%, #E5E5E5 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
}

.skeleton-storage {
  width: 60px;
  height: 24px;
  background: linear-gradient(90deg, #E5E5E5 25%, #F5F5F5 50%, #E5E5E5 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 6px;
  flex-shrink: 0;
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
  margin: 0 0 8px 0;
  font-size: 15px;
  color: #525252;
}

.empty-hint {
  font-size: 13px;
  color: #A3A3A3;
}
</style>
