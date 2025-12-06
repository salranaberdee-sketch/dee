<template>
  <div class="facility-list-page">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h1>สถานที่</h1>
        <p class="subtitle">จองสถานที่ฝึกซ้อมของสโมสร</p>
      </div>
      <router-link to="/my-bookings" class="btn-secondary">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        การจองของฉัน
      </router-link>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading">
      <div class="loading-spinner"></div>
      <span>กำลังโหลด...</span>
    </div>

    <!-- Empty State -->
    <div v-else-if="facilities.length === 0" class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
      <p>ยังไม่มีสถานที่ให้จอง</p>
    </div>

    <!-- Facility Grid -->
    <div v-else class="facility-grid">
      <FacilityCard 
        v-for="facility in facilities" 
        :key="facility.id"
        :facility="facility"
        @click="goToFacility(facility)"
      />
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useFacilityStore } from '@/stores/facility'
import FacilityCard from '@/components/FacilityCard.vue'

/**
 * FacilityListView - หน้ารายการสถานที่
 * Requirements: 1.1, 1.2, 1.3
 */

const router = useRouter()
const facilityStore = useFacilityStore()
const { facilities, loading } = storeToRefs(facilityStore)

function goToFacility(facility) {
  router.push(`/facilities/${facility.id}`)
}

onMounted(() => {
  facilityStore.fetchFacilities()
})
</script>

<style scoped>
.facility-list-page {
  padding: 24px;
  max-width: 1200px;
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

.btn-secondary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  font-size: 14px;
  color: #171717;
  text-decoration: none;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background: #F5F5F5;
}

.btn-secondary svg {
  width: 18px;
  height: 18px;
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

.empty-state {
  text-align: center;
  padding: 64px 24px;
  color: #737373;
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 12px;
}

.empty-state svg {
  width: 64px;
  height: 64px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state p {
  margin: 0;
  font-size: 16px;
  color: #525252;
}

.facility-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

@media (max-width: 768px) {
  .facility-list-page {
    padding: 16px;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .facility-grid {
    grid-template-columns: 1fr;
  }
}
</style>
