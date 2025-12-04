<template>
  <div class="bulk-athlete-selector">
    <!-- ส่วนค้นหาและปุ่มเลือก -->
    <div class="selector-header">
      <div class="search-box">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input 
          type="text" 
          v-model="searchQuery" 
          placeholder="ค้นหาชื่อนักกีฬา..."
          class="search-input"
        >
        <button v-if="searchQuery" class="clear-btn" @click="searchQuery = ''">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      
      <div class="action-buttons">
        <button class="btn-secondary btn-sm" @click="selectAll" :disabled="selectableAthletes.length === 0">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 11 12 14 22 4"/>
            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
          </svg>
          เลือกทั้งหมด
        </button>
        <button class="btn-secondary btn-sm" @click="deselectAll" :disabled="selectedAthletes.size === 0">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          </svg>
          ยกเลิกทั้งหมด
        </button>
      </div>
    </div>

    <!-- แสดงจำนวนที่เลือก -->
    <div v-if="selectedAthletes.size > 0" class="selected-count">
      <span class="count-badge">{{ selectedAthletes.size }}</span>
      <span>นักกีฬาที่เลือก</span>
    </div>

    <!-- รายการนักกีฬาจัดกลุ่มตามชมรม -->
    <div class="athletes-list">
      <div v-if="filteredAthletes.length === 0" class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p v-if="searchQuery">ไม่พบนักกีฬาที่ตรงกับ "{{ searchQuery }}"</p>
        <p v-else>ไม่มีนักกีฬาที่สามารถเพิ่มได้</p>
      </div>

      <div v-for="[clubId, clubAthletes] in groupedAthletes" :key="clubId" class="club-group">
        <div class="club-header" @click="toggleClubExpand(clubId)">
          <div class="club-info">
            <svg :class="['expand-icon', { expanded: expandedClubs.has(clubId) }]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
            <span class="club-name">{{ getClubName(clubId) }}</span>
            <span class="club-count">({{ clubAthletes.length }})</span>
          </div>
          <button 
            class="btn-text btn-sm" 
            @click.stop="selectClub(clubId)"
            :disabled="getSelectableInClub(clubId).length === 0"
          >
            เลือกทั้งชมรม
          </button>
        </div>

        <div v-show="expandedClubs.has(clubId)" class="club-athletes">
          <label 
            v-for="athlete in clubAthletes" 
            :key="athlete.id" 
            :class="['athlete-item', { disabled: isRegistered(athlete.id), selected: selectedAthletes.has(athlete.id) }]"
          >
            <input 
              type="checkbox" 
              :checked="selectedAthletes.has(athlete.id)"
              :disabled="isRegistered(athlete.id)"
              @change="toggleAthlete(athlete.id)"
            >
            <div class="athlete-avatar">{{ athlete.name?.charAt(0) || '?' }}</div>
            <div class="athlete-info">
              <div class="athlete-name">{{ athlete.name }}</div>
              <div class="athlete-meta">
                <span v-if="athlete.clubs?.name">{{ athlete.clubs.name }}</span>
              </div>
            </div>
            <span v-if="isRegistered(athlete.id)" class="registered-badge">ลงทะเบียนแล้ว</span>
          </label>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { groupAthletesByClub, filterAthletesByName } from '@/lib/tournamentUtils'

const props = defineProps({
  // รายการนักกีฬาทั้งหมด
  athletes: {
    type: Array,
    default: () => []
  },
  // รายการ ID ของนักกีฬาที่ลงทะเบียนแล้ว
  existingParticipantIds: {
    type: Array,
    default: () => []
  },
  // รายการชมรม (สำหรับแสดงชื่อ)
  clubs: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:selected'])

// State
const searchQuery = ref('')
const selectedAthletes = ref(new Set())
const expandedClubs = ref(new Set())

// สร้าง Set ของ ID ที่ลงทะเบียนแล้ว
const registeredIds = computed(() => new Set(props.existingParticipantIds))

// กรองนักกีฬาตามคำค้นหา
const filteredAthletes = computed(() => {
  return filterAthletesByName(props.athletes, searchQuery.value)
})

// จัดกลุ่มนักกีฬาตามชมรม
const groupedAthletes = computed(() => {
  return groupAthletesByClub(filteredAthletes.value)
})

// นักกีฬาที่สามารถเลือกได้ (ยังไม่ได้ลงทะเบียน)
const selectableAthletes = computed(() => {
  return filteredAthletes.value.filter(a => !registeredIds.value.has(a.id))
})

// ตรวจสอบว่านักกีฬาลงทะเบียนแล้วหรือไม่
function isRegistered(athleteId) {
  return registeredIds.value.has(athleteId)
}

// ดึงชื่อชมรมจาก ID
function getClubName(clubId) {
  if (clubId === 'no_club') return 'ไม่มีชมรม'
  const club = props.clubs.find(c => c.id === clubId)
  return club?.name || 'ไม่ระบุชมรม'
}

// ดึงนักกีฬาที่เลือกได้ในชมรม
function getSelectableInClub(clubId) {
  const clubAthletes = groupedAthletes.value.get(clubId) || []
  return clubAthletes.filter(a => !isRegistered(a.id))
}

// Toggle การขยาย/ยุบชมรม
function toggleClubExpand(clubId) {
  if (expandedClubs.value.has(clubId)) {
    expandedClubs.value.delete(clubId)
  } else {
    expandedClubs.value.add(clubId)
  }
}

// Toggle การเลือกนักกีฬา
function toggleAthlete(athleteId) {
  if (selectedAthletes.value.has(athleteId)) {
    selectedAthletes.value.delete(athleteId)
  } else {
    selectedAthletes.value.add(athleteId)
  }
  // สร้าง Set ใหม่เพื่อ trigger reactivity
  selectedAthletes.value = new Set(selectedAthletes.value)
}

// เลือกทั้งหมด (เฉพาะที่ยังไม่ได้ลงทะเบียน)
function selectAll() {
  selectableAthletes.value.forEach(a => {
    selectedAthletes.value.add(a.id)
  })
  selectedAthletes.value = new Set(selectedAthletes.value)
}

// ยกเลิกการเลือกทั้งหมด
function deselectAll() {
  selectedAthletes.value.clear()
  selectedAthletes.value = new Set(selectedAthletes.value)
}

// เลือกทั้งชมรม
function selectClub(clubId) {
  const selectableInClub = getSelectableInClub(clubId)
  selectableInClub.forEach(a => {
    selectedAthletes.value.add(a.id)
  })
  selectedAthletes.value = new Set(selectedAthletes.value)
  // ขยายชมรมถ้ายังไม่ได้ขยาย
  expandedClubs.value.add(clubId)
}

// ขยายชมรมแรกโดยอัตโนมัติ
watch(groupedAthletes, (newGroups) => {
  if (newGroups.size > 0 && expandedClubs.value.size === 0) {
    const firstClubId = newGroups.keys().next().value
    expandedClubs.value.add(firstClubId)
  }
}, { immediate: true })

// Emit การเปลี่ยนแปลงการเลือก
watch(selectedAthletes, (newSelected) => {
  emit('update:selected', Array.from(newSelected))
}, { deep: true })

// Expose สำหรับ parent component
defineExpose({
  selectedAthletes,
  selectAll,
  deselectAll,
  getSelectedCount: () => selectedAthletes.value.size
})
</script>


<style scoped>
.bulk-athlete-selector {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 400px;
}

/* ส่วนหัว - ค้นหาและปุ่ม */
.selector-header {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #F5F5F5;
  border-radius: 8px;
  border: 1px solid #E5E5E5;
}

.search-box svg {
  width: 18px;
  height: 18px;
  color: #737373;
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 14px;
  outline: none;
}

.search-input::placeholder {
  color: #A3A3A3;
}

.clear-btn {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.clear-btn svg {
  width: 16px;
  height: 16px;
  color: #737373;
}

.clear-btn:hover svg {
  color: #171717;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.btn-secondary {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #fff;
  color: #171717;
  border: 1px solid #E5E5E5;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-secondary:hover:not(:disabled) {
  background: #F5F5F5;
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary svg {
  width: 14px;
  height: 14px;
}

.btn-text {
  background: none;
  border: none;
  color: #171717;
  font-size: 12px;
  cursor: pointer;
  padding: 4px 8px;
}

.btn-text:hover:not(:disabled) {
  text-decoration: underline;
}

.btn-text:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-sm {
  padding: 4px 10px;
  font-size: 12px;
}

/* จำนวนที่เลือก */
.selected-count {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #171717;
  color: #fff;
  border-radius: 6px;
  font-size: 13px;
}

.count-badge {
  background: #fff;
  color: #171717;
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: 600;
  font-size: 12px;
}

/* รายการนักกีฬา */
.athletes-list {
  flex: 1;
  overflow-y: auto;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px;
  color: #737373;
  text-align: center;
}

.empty-state svg {
  width: 40px;
  height: 40px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.empty-state p {
  margin: 0;
  font-size: 14px;
}

/* กลุ่มชมรม */
.club-group {
  border-bottom: 1px solid #E5E5E5;
}

.club-group:last-child {
  border-bottom: none;
}

.club-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: #FAFAFA;
  cursor: pointer;
  user-select: none;
}

.club-header:hover {
  background: #F5F5F5;
}

.club-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.expand-icon {
  width: 16px;
  height: 16px;
  color: #737373;
  transition: transform 0.2s;
}

.expand-icon.expanded {
  transform: rotate(90deg);
}

.club-name {
  font-weight: 500;
  font-size: 14px;
  color: #171717;
}

.club-count {
  font-size: 12px;
  color: #737373;
}

/* รายการนักกีฬาในชมรม */
.club-athletes {
  padding: 4px 0;
}

.athlete-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px 8px 36px;
  cursor: pointer;
  transition: background 0.15s;
}

.athlete-item:hover:not(.disabled) {
  background: #F5F5F5;
}

.athlete-item.selected {
  background: #E5E5E5;
}

.athlete-item.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.athlete-item input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: #171717;
  cursor: pointer;
}

.athlete-item.disabled input[type="checkbox"] {
  cursor: not-allowed;
}

.athlete-avatar {
  width: 32px;
  height: 32px;
  background: #171717;
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 13px;
  flex-shrink: 0;
}

.athlete-info {
  flex: 1;
  min-width: 0;
}

.athlete-name {
  font-size: 14px;
  font-weight: 500;
  color: #171717;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.athlete-meta {
  font-size: 12px;
  color: #737373;
}

.registered-badge {
  font-size: 11px;
  padding: 2px 8px;
  background: #FEF3C7;
  color: #92400E;
  border-radius: 12px;
  white-space: nowrap;
}

/* Responsive - Mobile First */
@media (max-width: 640px) {
  .bulk-athlete-selector {
    max-height: calc(100vh - 250px);
  }
  
  /* ส่วนหัว - full width layout */
  .selector-header {
    gap: 12px;
  }
  
  .search-box {
    padding: 12px 14px;
  }
  
  /* ปุ่มค้นหา - touch-friendly (min 44px) */
  .search-input {
    font-size: 16px; /* ป้องกัน zoom บน iOS */
    min-height: 24px;
  }
  
  .clear-btn {
    min-width: 44px;
    min-height: 44px;
    padding: 10px;
  }
  
  .clear-btn svg {
    width: 20px;
    height: 20px;
  }
  
  .action-buttons {
    flex-wrap: wrap;
    gap: 8px;
  }
  
  /* ปุ่ม - touch-friendly (min 44px) */
  .btn-secondary {
    flex: 1;
    justify-content: center;
    min-height: 44px;
    padding: 10px 14px;
    font-size: 14px;
  }
  
  .btn-secondary svg {
    width: 18px;
    height: 18px;
  }
  
  /* จำนวนที่เลือก */
  .selected-count {
    padding: 10px 14px;
    font-size: 14px;
  }
  
  .count-badge {
    padding: 4px 10px;
    font-size: 14px;
  }
  
  /* รายการนักกีฬา - accordion style */
  .athletes-list {
    border-radius: 12px;
  }
  
  /* กลุ่มชมรม - accordion header */
  .club-header {
    padding: 14px 12px;
    flex-wrap: wrap;
    gap: 8px;
  }
  
  .club-info {
    flex: 1;
    min-width: 0;
  }
  
  .expand-icon {
    width: 20px;
    height: 20px;
  }
  
  .club-name {
    font-size: 15px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .club-count {
    font-size: 13px;
  }
  
  /* ปุ่มเลือกทั้งชมรม - touch-friendly */
  .btn-text {
    min-height: 44px;
    padding: 10px 12px;
    font-size: 14px;
  }
  
  /* รายการนักกีฬา - touch-friendly */
  .athlete-item {
    padding: 12px;
    gap: 12px;
    min-height: 60px;
  }
  
  /* Checkbox - touch-friendly */
  .athlete-item input[type="checkbox"] {
    width: 22px;
    height: 22px;
    min-width: 22px;
  }
  
  .athlete-avatar {
    width: 40px;
    height: 40px;
    font-size: 15px;
  }
  
  .athlete-name {
    font-size: 15px;
  }
  
  .athlete-meta {
    font-size: 13px;
  }
  
  .registered-badge {
    font-size: 12px;
    padding: 4px 10px;
  }
  
  /* Empty state */
  .empty-state {
    padding: 40px 20px;
  }
  
  .empty-state svg {
    width: 48px;
    height: 48px;
  }
  
  .empty-state p {
    font-size: 15px;
  }
}

/* Tablet */
@media (min-width: 641px) and (max-width: 1024px) {
  .bulk-athlete-selector {
    max-height: 450px;
  }
  
  .action-buttons {
    gap: 10px;
  }
  
  .btn-secondary {
    min-height: 40px;
  }
}
</style>
