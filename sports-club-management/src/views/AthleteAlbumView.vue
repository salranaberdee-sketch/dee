<script setup>
/**
 * AthleteAlbumView.vue - แสดงอัลบั้มของนักกีฬาที่เลือก
 * 
 * Requirements: 1.2, 1.3, 4.2, 4.3, 4.4
 * - 1.2: Coach เลือกนักกีฬาแล้วดูอัลบั้มของนักกีฬาคนนั้น
 * - 1.3: แสดงชื่อและรูปโปรไฟล์นักกีฬาที่ด้านบน
 * - 4.2: Admin ดูอัลบั้มเหมือนที่นักกีฬาเห็น
 * - 4.3: Admin เห็นชื่อชมรมและชื่อนักกีฬาใน header
 * - 4.4: Admin มี breadcrumb navigation (Clubs > Club > Athlete)
 */
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAlbumManagementStore } from '@/stores/albumManagement'
import { supabase } from '@/lib/supabase'
import UserAvatar from '@/components/UserAvatar.vue'
import AlbumSection from '@/components/AlbumSection.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const albumStore = useAlbumManagementStore()

// สถานะ
const loading = ref(true)
const error = ref(null)
const athlete = ref(null)
const club = ref(null)

// ตรวจสอบ role
const isAdmin = computed(() => auth.isAdmin)
const isCoach = computed(() => auth.isCoach)

// รหัสนักกีฬาจาก route params
const athleteId = computed(() => route.params.userId)

// Breadcrumb สำหรับ Admin
const breadcrumbs = computed(() => {
  const items = [
    { label: 'จัดการอัลบั้ม', to: '/albums' }
  ]
  
  if (isAdmin.value && club.value) {
    items.push({ 
      label: club.value.name, 
      to: `/albums/club/${club.value.id}` 
    })
  }
  
  if (athlete.value) {
    items.push({ 
      label: athlete.value.full_name || athlete.value.name, 
      to: null 
    })
  }
  
  return items
})

// โหลดข้อมูลนักกีฬา
async function loadAthleteData() {
  if (!athleteId.value) {
    error.value = 'ไม่พบรหัสนักกีฬา'
    loading.value = false
    return
  }

  loading.value = true
  error.value = null

  try {
    // ดึงข้อมูลนักกีฬา
    const { data: athleteData, error: athleteErr } = await supabase
      .from('user_profiles')
      .select(`
        id,
        name,
        avatar_url,
        club_id,
        role
      `)
      .eq('id', athleteId.value)
      .single()

    if (athleteErr) throw athleteErr
    if (!athleteData) throw new Error('ไม่พบข้อมูลนักกีฬา')

    // แปลง name เป็น full_name สำหรับ UI
    athlete.value = {
      ...athleteData,
      full_name: athleteData.name
    }

    // ดึงข้อมูลชมรม (สำหรับ Admin breadcrumb)
    if (athleteData.club_id) {
      const { data: clubData } = await supabase
        .from('clubs')
        .select('id, name')
        .eq('id', athleteData.club_id)
        .single()

      if (clubData) {
        club.value = clubData
      }
    }

    // ตรวจสอบสิทธิ์การเข้าถึง
    if (isCoach.value) {
      // Coach ต้องอยู่ชมรมเดียวกับนักกีฬา
      if (auth.profile?.club_id !== athleteData.club_id) {
        error.value = 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลนักกีฬาคนนี้'
        athlete.value = null
        return
      }
    }

  } catch (err) {
    error.value = err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล'
    athlete.value = null
  } finally {
    loading.value = false
  }
}

// โหลดข้อมูลเมื่อ mount
onMounted(() => {
  loadAthleteData()
})

// โหลดใหม่เมื่อ athleteId เปลี่ยน
watch(athleteId, () => {
  loadAthleteData()
})

// กลับไปหน้าก่อนหน้า
function goBack() {
  if (isAdmin.value && club.value) {
    router.push(`/albums/club/${club.value.id}`)
  } else {
    router.push('/albums')
  }
}

// นำทางไป breadcrumb
function navigateTo(to) {
  if (to) {
    router.push(to)
  }
}

// ลองโหลดใหม่
function retry() {
  loadAthleteData()
}
</script>

<template>
  <div class="athlete-album-view">
    <!-- Header -->
    <header class="page-header">
      <div class="header-top">
        <button class="btn-back" @click="goBack">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        
        <template v-if="athlete">
          <UserAvatar 
            :avatar-url="athlete.avatar_url"
            :user-name="athlete.full_name || athlete.name || ''"
            size="lg"
            class="header-avatar"
          />
          <div class="header-text">
            <h1>{{ athlete.full_name || athlete.name }}</h1>
            <p v-if="isAdmin && club">{{ club.name }}</p>
            <p v-else>อัลบั้มรูปภาพ</p>
          </div>
        </template>
        
        <template v-else-if="loading">
          <div class="header-skeleton">
            <div class="skeleton-avatar"></div>
            <div class="skeleton-text">
              <div class="skeleton-line"></div>
              <div class="skeleton-line short"></div>
            </div>
          </div>
        </template>
      </div>

      <!-- Breadcrumb (Admin) -->
      <nav v-if="isAdmin && !loading && athlete" class="breadcrumb">
        <template v-for="(item, index) in breadcrumbs" :key="index">
          <span 
            v-if="item.to" 
            class="breadcrumb-link" 
            @click="navigateTo(item.to)"
          >
            {{ item.label }}
          </span>
          <span v-else class="breadcrumb-current">{{ item.label }}</span>
          <svg 
            v-if="index < breadcrumbs.length - 1" 
            class="breadcrumb-separator"
            width="16" height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            stroke-width="2"
          >
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </template>
      </nav>
    </header>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>กำลังโหลดข้อมูล...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <p>{{ error }}</p>
      <button class="btn btn-primary" @click="retry">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="23 4 23 10 17 10"/>
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
        </svg>
        ลองใหม่
      </button>
    </div>

    <!-- Album Content -->
    <main v-else-if="athlete" class="main-content">
      <AlbumSection 
        :user-id="athlete.id" 
        :read-only="true"
      />
    </main>
  </div>
</template>

<style scoped>
.athlete-album-view {
  min-height: 100vh;
  background: #FAFAFA;
  padding-bottom: 80px;
}

/* Header */
.page-header {
  background: #fff;
  padding: 20px 16px;
  border-bottom: 1px solid #E5E5E5;
}

.header-top {
  display: flex;
  align-items: center;
  gap: 12px;
}

.btn-back {
  width: 36px;
  height: 36px;
  background: #F5F5F5;
  border: none;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s;
  flex-shrink: 0;
}

.btn-back:hover {
  background: #E5E5E5;
}

.btn-back svg {
  color: #525252;
}

.header-avatar {
  flex-shrink: 0;
}

.header-text {
  flex: 1;
  min-width: 0;
}

.header-text h1 {
  font-size: 18px;
  font-weight: 700;
  color: #171717;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.header-text p {
  font-size: 14px;
  color: #737373;
  margin: 4px 0 0 0;
}

/* Header Skeleton */
.header-skeleton {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.skeleton-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(90deg, #E5E5E5 25%, #F5F5F5 50%, #E5E5E5 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-text {
  flex: 1;
}

.skeleton-line {
  height: 18px;
  background: linear-gradient(90deg, #E5E5E5 25%, #F5F5F5 50%, #E5E5E5 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
  margin-bottom: 8px;
}

.skeleton-line.short {
  width: 60%;
  height: 14px;
  margin-bottom: 0;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Breadcrumb */
.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  font-size: 14px;
  flex-wrap: wrap;
}

.breadcrumb-link {
  color: #525252;
  cursor: pointer;
  transition: color 0.15s;
}

.breadcrumb-link:hover {
  color: #171717;
}

.breadcrumb-current {
  color: #171717;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 150px;
}

.breadcrumb-separator {
  color: #A3A3A3;
  flex-shrink: 0;
}

/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #737373;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #E5E5E5;
  border-top-color: #171717;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
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

/* Main Content */
.main-content {
  padding: 16px;
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
</style>
