<script setup>
/**
 * AlbumManagement.vue - หน้าจัดการอัลบั้มสำหรับ Coach และ Admin
 * 
 * Requirements: 1.1, 2.1, 3.1, 5.1
 * - 1.1: Coach ดูรายการนักกีฬาในชมรมพร้อมจำนวนอัลบั้ม
 * - 2.1: Coach มี search input สำหรับค้นหานักกีฬา
 * - 3.1: Admin ดูรายการชมรมทั้งหมดพร้อมสถิติ
 * - 5.1: Admin มี global search สำหรับค้นหาข้ามชมรม
 */
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAlbumManagementStore } from '@/stores/albumManagement'
import ClubAlbumList from '@/components/ClubAlbumList.vue'
import AthleteAlbumList from '@/components/AthleteAlbumList.vue'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const albumStore = useAlbumManagementStore()

// รหัสชมรมจาก route params (สำหรับ Admin)
const clubIdFromRoute = computed(() => route.params.clubId)

// สถานะการโหลด
const loading = ref(false)
const error = ref(null)

// คำค้นหา
const searchQuery = ref('')
const globalSearchResults = ref(null)
const isSearching = ref(false)

// ตรวจสอบ role
const isAdmin = computed(() => auth.isAdmin)
const isCoach = computed(() => auth.isCoach)

// ชมรมที่เลือก (สำหรับ Admin)
const selectedClub = computed(() => albumStore.selectedClub)

// Breadcrumb สำหรับ Admin
const breadcrumbs = computed(() => {
  const items = [{ label: 'จัดการอัลบั้ม', to: '/albums' }]
  
  if (isAdmin.value && selectedClub.value) {
    const club = albumStore.clubs.find(c => c.id === selectedClub.value)
    if (club) {
      items.push({ label: club.name, to: null })
    }
  }
  
  return items
})

// โหลดข้อมูลเมื่อ mount
onMounted(async () => {
  loading.value = true
  error.value = null
  
  try {
    if (isAdmin.value) {
      // Admin: โหลดรายการชมรมทั้งหมด
      await albumStore.fetchAllClubsWithStats()
      
      // ถ้ามี clubId จาก route ให้เลือกชมรมนั้นเลย
      if (clubIdFromRoute.value) {
        const club = albumStore.clubs.find(c => c.id === clubIdFromRoute.value)
        if (club) {
          albumStore.selectClub(club)
          await albumStore.fetchAthletesByClub(club.id)
        }
      }
    } else if (isCoach.value) {
      // Coach: โหลดนักกีฬาในชมรมของตัวเอง
      await albumStore.fetchAthletesInMyClub()
    }
  } catch (err) {
    error.value = err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล'
  } finally {
    loading.value = false
  }
})

// Watch สำหรับ route params เปลี่ยน
watch(clubIdFromRoute, async (newClubId) => {
  if (!isAdmin.value) return
  
  if (newClubId) {
    // มี clubId ใหม่ ให้โหลดนักกีฬาในชมรมนั้น
    const club = albumStore.clubs.find(c => c.id === newClubId)
    if (club) {
      loading.value = true
      try {
        albumStore.selectClub(club)
        await albumStore.fetchAthletesByClub(club.id)
      } catch (err) {
        error.value = err.message
      } finally {
        loading.value = false
      }
    }
  } else {
    // ไม่มี clubId ให้กลับไปหน้ารายการชมรม
    albumStore.clearSelection()
  }
})

// ค้นหา (debounced)
let searchTimeout = null
watch(searchQuery, (newQuery) => {
  if (searchTimeout) clearTimeout(searchTimeout)
  
  if (!newQuery || newQuery.trim() === '') {
    globalSearchResults.value = null
    albumStore.searchAthletes('')
    return
  }
  
  searchTimeout = setTimeout(async () => {
    if (isAdmin.value && !selectedClub.value) {
      // Admin global search
      isSearching.value = true
      try {
        globalSearchResults.value = await albumStore.globalSearch(newQuery)
      } finally {
        isSearching.value = false
      }
    } else {
      // Coach หรือ Admin ที่เลือกชมรมแล้ว: ค้นหาในรายการนักกีฬา
      albumStore.searchAthletes(newQuery)
    }
  }, 300)
})

// เลือกชมรม (Admin) - ใช้ router navigation
function handleSelectClub(club) {
  searchQuery.value = ''
  globalSearchResults.value = null
  router.push(`/albums/club/${club.id}`)
}

// กลับไปหน้ารายการชมรม (Admin) - ใช้ router navigation
function handleBackToClubs() {
  searchQuery.value = ''
  globalSearchResults.value = null
  router.push('/albums')
}

// เลือกนักกีฬา
function handleSelectAthlete(athlete) {
  router.push(`/albums/athlete/${athlete.id}`)
}

// คลิกผลการค้นหา
function handleSearchResultClick(athlete) {
  router.push(`/albums/athlete/${athlete.id}`)
}

// ลองโหลดใหม่
async function retry() {
  error.value = null
  loading.value = true
  
  try {
    if (isAdmin.value) {
      if (selectedClub.value) {
        await albumStore.fetchAthletesByClub(selectedClub.value)
      } else {
        await albumStore.fetchAllClubsWithStats()
      }
    } else if (isCoach.value) {
      await albumStore.fetchAthletesInMyClub()
    }
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="album-management">
    <!-- Header -->
    <header class="page-header">
      <div class="header-top">
        <button 
          v-if="isAdmin && selectedClub" 
          class="btn-back" 
          @click="handleBackToClubs"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div class="header-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
        </div>
        <div class="header-text">
          <h1>จัดการอัลบั้ม</h1>
          <p v-if="isAdmin && !selectedClub">ดูอัลบั้มของนักกีฬาทุกชมรม</p>
          <p v-else-if="isAdmin && selectedClub">
            {{ albumStore.clubs.find(c => c.id === selectedClub)?.name || 'ชมรม' }}
          </p>
          <p v-else-if="isCoach">ดูอัลบั้มของนักกีฬาในชมรม</p>
        </div>
      </div>

      <!-- Breadcrumb (Admin) -->
      <nav v-if="isAdmin && selectedClub" class="breadcrumb">
        <template v-for="(item, index) in breadcrumbs" :key="index">
          <span 
            v-if="item.to" 
            class="breadcrumb-link" 
            @click="handleBackToClubs"
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

      <!-- Search Input -->
      <div class="search-container">
        <div class="search-input-wrap">
          <svg class="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            :placeholder="isAdmin && !selectedClub ? 'ค้นหาชมรมหรือนักกีฬา...' : 'ค้นหานักกีฬา...'"
            class="search-input"
          />
          <button 
            v-if="searchQuery" 
            class="search-clear" 
            @click="searchQuery = ''"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>
    </header>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>กำลังโหลดข้อมูล...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error || albumStore.error" class="error-state">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <p>{{ error || albumStore.error }}</p>
      <button class="btn btn-primary" @click="retry">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="23 4 23 10 17 10"/>
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
        </svg>
        ลองใหม่
      </button>
    </div>

    <!-- Global Search Results (Admin) -->
    <div v-else-if="isAdmin && !selectedClub && globalSearchResults" class="search-results">
      <div v-if="isSearching" class="searching">
        <div class="spinner-sm"></div>
        <span>กำลังค้นหา...</span>
      </div>
      
      <template v-else>
        <!-- ผลการค้นหาชมรม -->
        <div v-if="globalSearchResults.clubs?.length > 0" class="result-section">
          <h3 class="result-title">ชมรม</h3>
          <div class="result-list">
            <div 
              v-for="club in globalSearchResults.clubs" 
              :key="club.id"
              class="result-item"
              @click="handleSelectClub(club)"
            >
              <div class="result-icon club-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                </svg>
              </div>
              <span class="result-name">{{ club.name }}</span>
              <svg class="result-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </div>
          </div>
        </div>

        <!-- ผลการค้นหานักกีฬา (จัดกลุ่มตามชมรม) -->
        <div v-if="globalSearchResults.athletesByClub?.length > 0" class="result-section">
          <h3 class="result-title">นักกีฬา</h3>
          <div v-for="group in globalSearchResults.athletesByClub" :key="group.club_id" class="result-group">
            <div class="group-header">{{ group.club_name }}</div>
            <div class="result-list">
              <div 
                v-for="athlete in group.athletes" 
                :key="athlete.id"
                class="result-item"
                @click="handleSearchResultClick(athlete)"
              >
                <div class="result-avatar">
                  <img v-if="athlete.avatar_url" :src="athlete.avatar_url" :alt="athlete.full_name" />
                  <span v-else class="avatar-fallback">{{ (athlete.full_name || '?')[0] }}</span>
                </div>
                <span class="result-name">{{ athlete.full_name }}</span>
                <svg class="result-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <!-- ไม่พบผลการค้นหา -->
        <div 
          v-if="!globalSearchResults.clubs?.length && !globalSearchResults.athletesByClub?.length" 
          class="no-results"
        >
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <p>ไม่พบผลลัพธ์ที่ตรงกับ "{{ searchQuery }}"</p>
        </div>
      </template>
    </div>

    <!-- Main Content -->
    <main v-else class="main-content">
      <!-- Admin: แสดงรายการชมรม หรือ นักกีฬาในชมรมที่เลือก -->
      <template v-if="isAdmin">
        <ClubAlbumList 
          v-if="!selectedClub"
          :clubs="albumStore.clubs"
          :loading="loading"
          :error="albumStore.error"
          @select="handleSelectClub"
          @retry="retry"
        />
        <AthleteAlbumList 
          v-else
          :athletes="albumStore.filteredAthletes"
          :search-query="searchQuery"
          :loading="loading"
          :error="albumStore.error"
          @select="handleSelectAthlete"
          @retry="retry"
        />
      </template>

      <!-- Coach: แสดงรายการนักกีฬาในชมรม -->
      <AthleteAlbumList 
        v-else-if="isCoach"
        :athletes="albumStore.filteredAthletes"
        :search-query="searchQuery"
        :loading="loading"
        :error="albumStore.error"
        @select="handleSelectAthlete"
        @retry="retry"
      />
    </main>
  </div>
</template>

<style scoped>
.album-management {
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
  margin-bottom: 16px;
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
}

.btn-back:hover {
  background: #E5E5E5;
}

.btn-back svg {
  color: #525252;
}

.header-icon {
  width: 48px;
  height: 48px;
  background: #171717;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.header-icon svg {
  width: 24px;
  height: 24px;
  color: #fff;
}

.header-text h1 {
  font-size: 20px;
  font-weight: 700;
  color: #171717;
  margin: 0;
}

.header-text p {
  font-size: 14px;
  color: #737373;
  margin: 4px 0 0 0;
}

/* Breadcrumb */
.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  font-size: 14px;
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
}

.breadcrumb-separator {
  color: #A3A3A3;
}

/* Search */
.search-container {
  margin-top: 16px;
}

.search-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 14px;
  color: #A3A3A3;
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 12px 40px 12px 44px;
  border: 1.5px solid #E5E5E5;
  border-radius: 12px;
  font-size: 15px;
  font-family: inherit;
  background: #fff;
  transition: border-color 0.15s;
}

.search-input:focus {
  outline: none;
  border-color: #171717;
}

.search-input::placeholder {
  color: #A3A3A3;
}

.search-clear {
  position: absolute;
  right: 12px;
  width: 24px;
  height: 24px;
  background: #F5F5F5;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s;
}

.search-clear:hover {
  background: #E5E5E5;
}

.search-clear svg {
  color: #737373;
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

.spinner-sm {
  width: 20px;
  height: 20px;
  border: 2px solid #E5E5E5;
  border-top-color: #171717;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
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

/* Search Results */
.search-results {
  padding: 16px;
}

.searching {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px 20px;
  color: #737373;
}

.result-section {
  margin-bottom: 24px;
}

.result-title {
  font-size: 13px;
  font-weight: 600;
  color: #737373;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0 0 12px 0;
}

.result-group {
  margin-bottom: 16px;
}

.group-header {
  font-size: 12px;
  font-weight: 500;
  color: #A3A3A3;
  padding: 8px 0;
  border-bottom: 1px solid #F5F5F5;
}

.result-list {
  background: #fff;
  border-radius: 12px;
  border: 1px solid #E5E5E5;
  overflow: hidden;
}

.result-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  cursor: pointer;
  transition: background 0.15s;
}

.result-item:not(:last-child) {
  border-bottom: 1px solid #F5F5F5;
}

.result-item:hover {
  background: #FAFAFA;
}

.result-icon {
  width: 40px;
  height: 40px;
  background: #F5F5F5;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.result-icon.club-icon {
  background: #171717;
}

.result-icon.club-icon svg {
  color: #fff;
}

.result-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #404040 0%, #171717 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.result-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-fallback {
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  text-transform: uppercase;
}

.result-name {
  flex: 1;
  font-size: 15px;
  font-weight: 500;
  color: #171717;
}

.result-arrow {
  color: #A3A3A3;
}

.no-results {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #737373;
  text-align: center;
}

.no-results svg {
  color: #D4D4D4;
  margin-bottom: 16px;
}

.no-results p {
  margin: 0;
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
